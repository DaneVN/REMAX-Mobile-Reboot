import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

/**
 * The entry point of the React application. It renders the App component inside a StrictMode and BrowserRouter for routing.
 * @returns
 */

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App classN="flex flex-col" />
    </BrowserRouter>
  </StrictMode>,
);
