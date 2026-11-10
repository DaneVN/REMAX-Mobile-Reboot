import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { isValidEmail } from "../../lib/validators";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Same message whether or not the account exists, so this page can't be
    // used to find out which emails are registered.
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--cl-base-dark) p-4">
      <div className="w-full max-w-md bg-(--cl-white) rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-(--cl-dark-blue) mb-6">
          Reset password
        </h2>
        {sent ? (
          <p className="text-(--cl-dark-blue)">
            If an account exists for {email.trim()}, a reset link is on its way.
            Check your inbox (and spam).
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <label
              htmlFor="email"
              className="text-sm font-medium text-(--cl-dark-blue)"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 border border-(--cl-base) rounded-lg"
            />
            {error && (
              <p role="alert" className="text-(--cl-accent-dark) text-sm">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-(--cl-accent) hover:bg-(--cl-accent-dark) text-(--cl-white) font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
        <p className="text-center text-sm mt-6">
          <Link to="/login" className="underline text-(--cl-dark-blue)">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
