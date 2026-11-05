import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { useUserRole } from "../../lib/useUserRole";

function AdminRequired() {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (authLoading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );
  if (!session) return <Navigate to="/login" replace />;
  if (roleLoading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default AdminRequired;
