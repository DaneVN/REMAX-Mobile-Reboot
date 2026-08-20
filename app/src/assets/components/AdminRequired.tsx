import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";

function AdminRequired() {
  const { session, loading: authLoading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    // No session yet — nothing to fetch. Render handles the redirect;
    // no setState needed here, so no synchronous state update on mount.
    if (!session) return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return; // component unmounted or session changed mid-request
        setRole(data?.role ?? null);
        setRoleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (authLoading) return null; // or a spinner
  if (!session) return <Navigate to="/login" replace />;
  if (roleLoading) return null; // or a spinner
  if (role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}

export default AdminRequired;
