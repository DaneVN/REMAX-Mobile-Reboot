import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "../../lib/useUserRole";

// Route guard for pages that only make sense for an agent's own deals
// (e.g. Pipeline). Admins are sent back to Home. Must sit inside AuthRequired.
function AgentOnly() {
  const { isAdmin, loading } = useUserRole();

  if (loading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );
  if (isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default AgentOnly;
