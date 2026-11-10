import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthProvider";

const MIN_LENGTH = 8;

// Landing page for the emailed reset link. Supabase signs the user in from the
// link (a temporary recovery session); we then let them choose a new password.
function ResetPassword() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/", { replace: true }), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--cl-base-dark) p-4">
      <div className="w-full max-w-md bg-(--cl-white) rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-(--cl-dark-blue) mb-6">
          Choose a new password
        </h2>
        {authLoading ? (
          <p>Checking your link...</p>
        ) : !session ? (
          <p className="text-(--cl-dark-blue)">
            This reset link is invalid or has expired.{" "}
            <Link to="/forgot-password" className="underline">
              Request a new one
            </Link>
            .
          </p>
        ) : done ? (
          <p className="text-(--cl-dark-blue)">
            Password updated. Redirecting...
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              aria-label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-2 border border-(--cl-base) rounded-lg"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              aria-label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="px-4 py-2 border border-(--cl-base) rounded-lg"
            />
            {error && (
              <p role="alert" className="text-(--cl-accent-dark) text-sm">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-(--cl-accent) hover:bg-(--cl-accent-dark) text-(--cl-white) font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
