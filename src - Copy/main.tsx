
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css";
import "./styles/theme.css";
import "./styles/app-global.css";

import "./styles/typography.css";
import "./styles/button.css";
import "./styles/form.css";
import "./styles/filter.css";
import "./styles/table.css";
import "./styles/modal.css";
import "./styles/pagination.css";
import "./styles/settings-widgets.css";
import "./styles/ema-layout.css";
import "./styles/module-container.css";
import "./styles/management-control-settings.css";
import "./styles/notification-channels.css";
import "./styles/ema-system-shell.css";
import "./styles/module-ui-fixes.css";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/ema-table-system-lock-final.css";
import "./styles/ema-table-data-no-box-hard.css";
import "./styles/ema-action-icon-button-force.css";
import "./styles/ema-action-icon-button-spacing-final.css";
import "./styles/ema-delete-action-red-final.css";
import "./styles/toast.css";
import "./styles/ema-special-operational-table-override.css";
import "./styles/ema-table-container-spacing-final.css";
import "./styles/app-metering-target-table-hard-final.css";
import "./styles/app-metering-target-table-direct-final.css";
import "./styles/ema-tree-final-clean-only.css";
import "./styles/ema-tree-layout-reserve-final.css";
import "./styles/ema-hide-tree-panel-title.css";
import "./styles/network-inventory-table-final-fix.css";
import "./utils/emaTreeFinalCleanOnly";
import "./utils/emaTreeLayoutReserveFinal";
import "./utils/emaHideTreePanelTitle";

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
