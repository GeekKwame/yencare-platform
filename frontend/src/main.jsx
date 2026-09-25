import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { StaffAuthProvider } from "./context/StaffAuthContext.jsx";
import { ToastProvider } from "./components/ui";
import { registerServiceWorker } from "./registerServiceWorker.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <StaffAuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StaffAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

registerServiceWorker();
