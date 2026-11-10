// app/src/lib/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  // The signed-in user's profiles.role, fetched once here so every component
  // that needs it (nav, guards, cards) shares one request instead of each
  // firing its own.
  role: string | null;
  roleLoading: boolean;
  // True when the role couldn't be loaded after retries (e.g. a transient
  // 401 "JWT issued at future"). Guards show a "Try again" screen instead of
  // silently treating an admin as an agent.
  roleError: boolean;
  retryRole: () => void;
};
const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  role: null,
  roleLoading: true,
  roleError: false,
  retryRole: () => {},
});

// Fetch the role, retrying with a short back-off. Right after sign-in Supabase
// can briefly reject a fresh token ("JWT issued at future" when the device
// clock is slightly ahead); without retries an admin would silently be treated
// as an agent. Returns failed: true if every attempt errored.
const RETRY_DELAYS_MS = [1000, 2000];

async function fetchRole(
  userId: string,
): Promise<{ role: string | null; failed: boolean }> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (!error) return { role: data?.role ?? null, failed: false };
    if (attempt < RETRY_DELAYS_MS.length)
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
  return { role: null, failed: true };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedRole, setLoadedRole] = useState<{
    userId: string;
    role: string | null;
    failed: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetchRole(userId).then(({ role, failed }) => {
      if (cancelled) return;
      setLoadedRole({ userId, role, failed });
    });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  // Derived, so a previous user's role can never leak across a sign-out /
  // sign-in on the same device.
  const roleMatchesUser = userId !== null && loadedRole?.userId === userId;
  const role = roleMatchesUser ? loadedRole.role : null;
  const roleLoading = userId !== null && !roleMatchesUser;
  const roleError = roleMatchesUser && loadedRole.failed;

  function retryRole() {
    setLoadedRole(null); // back to the loading state
    setAttempt((n) => n + 1);
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, role, roleLoading, roleError, retryRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
