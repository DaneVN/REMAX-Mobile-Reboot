import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";

function AuthRequired() {
  const { session, loading } = useAuth();

  if (loading) return null; // or a spinner
  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default AuthRequired;
