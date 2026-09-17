import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";

function AuthRequired() {
  const { session, loading } = useAuth();

  if (loading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );
  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default AuthRequired;
