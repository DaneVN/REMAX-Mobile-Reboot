import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--cl-base-dark) p-4">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-(--cl-white) mb-2">
            RE/MAX Unity
          </h1>
          <p className="text-(--cl-base) text-lg">Real Estate Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-(--cl-white) rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-(--cl-dark-blue) mb-6">
            Sign In
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-(--cl-dark-blue)"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-2 border border-(--cl-base) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--cl-accent) focus:border-transparent transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-(--cl-dark-blue)"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="px-4 py-2 border border-(--cl-base) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--cl-accent) focus:border-transparent transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-(--cl-accent)/10 border border-(--cl-accent) text-(--cl-accent-dark) px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-(--cl-accent) hover:bg-(--cl-accent-dark) text-(--cl-white) font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-(--cl-dark-blue)/60 text-sm mt-6">
            Need help? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
