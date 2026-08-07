import { Route, Routes } from "react-router-dom";
import Home from "./assets/page/Home";
// AuthRequired component is going to be used to protect routes that require authentication
// e.g. https://github.com/DaneVN/CS20240232_FTO2407_GroupB_DanevanNiekerk_DJS08/blob/main/components/AuthRequired.jsx

/**
 * App component that serves as the root of the application. It sets up routing and applies a className for global styling.
 * @param param0
 * @returns
 */

function App({ classN }: { classN: string }) {
  // classN datatype is string, but React passes it as an object, so we need to destructure it from the props object
  return (
    // apply classN to the root div of the app for styling purposes
    <div className={classN}>
      {/* Define your routes here */}
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
}

export default App;
