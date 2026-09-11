import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";

function Navbar() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }

  return (
    <>
      <nav className="bg-(--cl-base-dark) text-(--cl-white) p-4 shadow-md">
        <ul className="flex space-x-4 justify-between items-center max-w-7xl mx-auto">
          {/* Navigation Links */}
          {/* Make the links collapse into a dropdown when in mobile view */}
          <select
            className="block sm:hidden bg-(--cl-base-dark) text-(--cl-white) p-2 rounded"
            onChange={(e) => navigate(e.target.value)}
          >
            <option value="/">Home</option>
            <option value="/workflow">Boards</option>
            <option value="/calculator">Calculator</option>
          </select>
          <div className="hidden sm:flex sm:space-x-6">
            <li>
              <a
                href="/"
                className="hover:text-(--cl-accent) transition-colors duration-150"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/workflow"
                className="hover:text-(--cl-accent) transition-colors duration-150"
              >
                Boards
              </a>
            </li>
            <li>
              <a
                href="/calculator"
                className="hover:text-(--cl-accent) transition-colors duration-150"
              >
                Calculator
              </a>
            </li>
          </div>

          {/* User Section */}
          {session && (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              <span className="text-(--cl-base) text-sm">
                {session.user.email}
              </span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-3 py-1 rounded border border-(--cl-accent) text-(--cl-white) hover:bg-(--cl-accent) hover:text-(--cl-white) transition-colors duration-150"
              >
                Log Out
              </button>
            </div>
          )}
        </ul>
      </nav>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out?"
        message="Are you sure you want to sign out of RE/MAX Unity?"
        confirmLabel={loggingOut ? "Signing out..." : "Sign Out"}
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

export default Navbar;
