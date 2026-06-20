import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./components/ema/EmaRuntimeStyles";
import "./components/ema/EmaSidebarRuntimeStyles";
import "./components/ema/EmaToolbarRuntimeStyles";
import "./components/ema/EmaButtonRuntimeStyles";
import "./components/ema/EmaTableRuntimeStyles";
import "./components/ema/EmaPaginationRuntimeStyles";
import "./components/ema/EmaStatisticRuntimeStyles";
import "./components/ema/EmaBarePageRuntimeStyles";
import "./components/ema/EmaLoadingRuntimeStyles";
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
