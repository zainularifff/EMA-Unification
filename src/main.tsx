import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./components/ema/EmaNetworkHierarchyFallback";
import "./components/ema/EmaRuntimeStyles";
import "./components/ema/EmaSidebarRuntimeStyles";
import "./components/ema/EmaToolbarRuntimeStyles";
import "./components/ema/EmaDropdownRuntimeStyles";
import "./components/ema/EmaSelectRuntime";
import "./components/ema/EmaButtonRuntimeStyles";
import "./components/ema/EmaTableRuntimeStyles";
import "./components/ema/EmaPaginationRuntimeStyles";
import "./components/ema/EmaActionRuntimeStyles";
import "./components/ema/EmaFormRuntimeStyles";
import "./components/ema/EmaModalRuntimeStyles";
import "./components/ema/EmaDeviceActionModalRuntimeStyles";
import "./components/ema/EmaStatisticRuntimeStyles";
import "./components/ema/EmaBarePageRuntimeStyles";
import "./components/ema/EmaNetworkRuntimeStyles";
import "./components/ema/EmaNetworkSidebarRuntimeStyles";
import "./components/ema/EmaLoadingRuntimeStyles";
import "./components/ema/SettingsLoadingRuntime";
import "./components/ema/SettingsManagementMenuRuntime";
import "./components/ema/EmaNoticeRuntimeStyles";
import "./components/ema/EmaServiceDeskTableRuntimeStyles";
import "./styles/settings-resource-planning.css";
import "./styles/settings-shared-controls.css";
import "./styles/settings-sidebar-compact.css";
import "./styles/settings-role-modal.css";
import "./styles/settings-select-controls.css";
import "./styles/settings-user-modal-layout.css";
import "./styles/settings-user-table-clean.css";
import "./styles/settings-module-control.css";
import "./styles/settings-access-control.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

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
