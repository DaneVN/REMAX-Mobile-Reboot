import { Route, Routes } from "react-router-dom";
import Home from "./assets/pages/Home";
import Login from "./assets/pages/Login";
import Workflow from "./assets/pages/Workflow";
import NewDeal from "./assets/pages/NewDeal";
import EditDeal from "./assets/pages/EditDeal";
// import Pipeline from "./assets/pages/Pipeline";
import Calculator from "./assets/pages/Calculator";
// import Stats from "./assets/pages/Stats";
import AuthRequired from "./assets/components/AuthRequired";
import Layout from "./assets/pages/Layout";
import WorkflowIndex from "./assets/pages/WorkflowIndex";
import AdminRequired from "./assets/components/AdminRequired";
// import AdminRequired from "./assets/components/AdminRequired";

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
        {/* Public route — no session required */}
        <Route path="/login" element={<Login />} />

        {/* Routes below require a logged-in session (any role) */}
        <Route element={<AuthRequired />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/workflow" element={<WorkflowIndex />} />
            <Route path="/workflow/:dealId" element={<Workflow />} />
            <Route path="/deals/new" element={<NewDeal />} />
            <Route path="/deals/:dealId/edit" element={<EditDeal />} />
            {/*<Route path="/pipeline" element={<Pipeline />} />*/}
            <Route path="/calculator" element={<Calculator />} />
          </Route>
        </Route>

        {/* Routes below require a logged-in session AND role = 'admin' */}
        <Route element={<AdminRequired />}>
          {/* <Route path="/stats" element={<Stats />} />  */}
        </Route>
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </div>
  );
}

export default App;
