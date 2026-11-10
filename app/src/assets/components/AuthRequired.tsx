import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import RoleLoadError from "./RoleLoadError";

function AuthRequired() {
  const { session, loading, roleError } = useAuth();

  if (loading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );
  if (!session) return <Navigate to="/login" replace />;

  if (roleError) return <RoleLoadError />;

  return <Outlet />;
}

export default AuthRequired;
