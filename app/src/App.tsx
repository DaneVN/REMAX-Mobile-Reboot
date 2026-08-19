import { Route, Routes } from "react-router-dom";
import Home from "./assets/pages/Home";
import Login from "./assets/pages/Login";
// import Workflow from "./assets/pages/Workflow";
// import Pipeline from "./assets/pages/Pipeline";
// import Calculator from "./assets/pages/Calculator";
// import Stats from "./assets/pages/Stats";
import AuthRequired from "./assets/components/AuthRequired";
import Layout from "./assets/pages/Layout";
// import AdminRequired from "./assets/components/AdminRequired";

/**
 * App component that serves as the root of the application. It sets up routing and applies a className for global styling.
 * @param param0 - An object containing the className to be applied to the root div of the app.
 * @param param0.classN - A string representing the className to be applied to the root div of the app.
 * @returns
 */

function App({ classN }: { classN: string }) {
  // classN datatype is string, but React passes it as an object, so we need to destructure it from the props object
  return (
    // apply classN to the root div of the app for styling purposes
    <div className={classN}>
      {/* Define your routes here */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthRequired />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />{" "}
            {/* <Route path="/workflow" element={<Workflow />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/calculator" element={<Calculator />} /> */}
          </Route>
          {/* </Route> */}
          {/* <Route element={<AdminRequired />}> */}
          {/* <Route path="/stats" element={<Stats />} /> */}
        </Route>
      </Routes>
    </div>
  );
}

export default App;
