import { Link } from "react-router-dom";
import { useUserRole } from "../../lib/useUserRole";

function AppCard() {
  const { isAdmin } = useUserRole();

  return (
    <div
      id="apps"
      className="bg-(--cl-base-dark) text-(--cl-white) p-4 rounded shadow-md w-full max-w-2xl"
    >
      <h2>App Card</h2>
      <p>Quick access to your tools.</p>
      <ul className="grid grid-cols-2 gap-2 mt-4 md:auto-cols-auto place-self-center">
        <li>
          {/* Admins have no personal pipeline; they get the team overview instead */}
          {isAdmin ? (
            <Link
              to="/stats"
              className="bg-(--cl-base) text-(--cl-base-dark) p-2 rounded shadow-md max-w-2xl items-center justify-center flex"
            >
              Team overview
            </Link>
          ) : (
            <Link
              to="/pipeline"
              className="bg-(--cl-base) text-(--cl-base-dark) p-2 rounded shadow-md max-w-2xl items-center justify-center flex"
            >
              Pipeline
            </Link>
          )}
        </li>
        <li>
          <Link
            to="/calculator"
            className="bg-(--cl-base) text-(--cl-base-dark) p-2 rounded shadow-md max-w-2xl items-center justify-center flex"
          >
            Calculator
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default AppCard;
