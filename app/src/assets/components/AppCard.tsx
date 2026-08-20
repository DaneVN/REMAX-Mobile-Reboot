import { Link } from "react-router-dom";

function AppCard() {
  return (
    <div
      id="apps"
      className="bg-(--cl-accent-dark) text-(--cl-white) p-4 rounded shadow-md w-full max-w-2xl"
    >
      <h2>App Card</h2>
      <p>Quick access to your tools.</p>
      <ul className="grid grid-cols-2 gap-2 mt-4 md:grid-cols-3 lg:grid-cols-4 place-self-center">
        <li>
          <Link
            to="/workflow"
            className="bg-(--cl-accent) text-(--cl-white) p-2 rounded shadow-md w-45 max-w-2xl h-40 items-center justify-center flex"
          >
            Workflow
          </Link>
        </li>
        <li>
          <Link
            to="/pipeline"
            className="bg-(--cl-accent) text-(--cl-white) p-2 rounded shadow-md w-45 max-w-2xl h-40 items-center justify-center flex"
          >
            Pipeline
          </Link>
        </li>
        <li>
          <Link
            to="/calculator"
            className="bg-(--cl-accent) text-(--cl-white) p-2 rounded shadow-md w-45 max-w-2xl h-40 items-center justify-center flex"
          >
            Calculator
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default AppCard;
