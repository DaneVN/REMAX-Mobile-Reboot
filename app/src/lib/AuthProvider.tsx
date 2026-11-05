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
};
const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  role: null,
  roleLoading: true,
});

// Fetch the role with one retry after ~1s. Right after sign-in Supabase can
// briefly reject a fresh token ("JWT issued at future" when the device clock
// is slightly ahead); without the retry an admin would silently be treated
// as an agent until the next refresh.
async function fetchRole(userId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (!error) return data?.role ?? null;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedRole, setLoadedRole] = useState<{
    userId: string;
    role: string | null;
  } | null>(null);

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

    fetchRole(userId).then((role) => {
      if (cancelled) return;
      setLoadedRole({ userId, role });
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Derived, so a previous user's role can never leak across a sign-out /
  // sign-in on the same device.
  const roleMatchesUser = userId !== null && loadedRole?.userId === userId;
  const role = roleMatchesUser ? loadedRole.role : null;
  const roleLoading = userId !== null && !roleMatchesUser;

  return (
    <AuthContext.Provider value={{ session, loading, role, roleLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
