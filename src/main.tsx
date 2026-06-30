
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/buttons-forms.css";
import "./styles/sidebar.css";
import "./styles/topbar.css";
import "./styles/panel.css";
import "./styles/tree.css";
import "./styles/kpi.css";
import "./styles/toolbar.css";
import "./styles/table.css";
import "./styles/pagination.css";
import "./styles/toast.css";
import "./styles/modal.css";
import "./styles/device-panel.css";
import "./styles/geo-modal.css";
import "./styles/software-insights.css";
import "./styles/dark.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
// Legacy heuristic DOM-hack scripts (emaTreeFinalCleanOnly, emaTreeLayoutReserveFinal,
// emaHideTreePanelTitle) forced inline !important sizing/visibility per page using
// mismatched per-route exclude lists, which is what caused sidebar width/sizing to
// differ across pages. Retired in favor of the unified .settings-layout/.ema-panel-surface
// CSS system, which every page already shares the same class names for.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
