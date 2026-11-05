import { useAuth } from "./AuthProvider";

// Thin wrapper over the role AuthProvider already loaded -- no extra request.
export function useUserRole() {
  const { role, roleLoading } = useAuth();
  return { role, loading: roleLoading, isAdmin: role === "admin" };
}
