import { useAuth } from "../../lib/AuthProvider";

// Shown instead of the app when the signed-in user's role couldn't be loaded
// (usually a brief token / clock hiccup right after sign-in).
function RoleLoadError() {
  const { retryRole } = useAuth();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-6">
      <p>We couldn't load your account. Please try again.</p>
      <button
        type="button"
        onClick={retryRole}
        className="bg-(--cl-base-dark) text-(--cl-white) px-4 py-2 rounded"
      >
        Try again
      </button>
    </div>
  );
}

export default RoleLoadError;
