import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabaseClient";

export function useUserRole() {
  const { session } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setRole(data?.role ?? null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return { role, loading, isAdmin: role === "admin" };
}
