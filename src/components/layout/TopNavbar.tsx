import { Bell, Moon, Search, Sparkles, Sun, UserCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

import { useTheme } from "../../context/ThemeContext";
import EmaAssistWidget from "../AIAssist/EmaAssistWidget";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of your EMA workspace.",
  },
  "/hardware": {
    title: "Hardware Inventory",
    subtitle: "Track assets, ownership and lifecycle status.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Control access, rules and system configuration.",
  },
};

function openEmaAssistant() {
  window.dispatchEvent(new CustomEvent("ema-ai-assist-open"));
}

export function TopNavbar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const current = pageMeta[location.pathname] || {
    title: "EMA System",
    subtitle: "Operations Console",
  };

  return (
    <>
      <header className="ema-topbar">
        <div className="ema-topbar-title">
          <h1>{current.title}</h1>
          <p>{current.subtitle}</p>
        </div>

        <div className="ema-global-search">
          <Search size={17} />
          <input placeholder="Search assets, users, devices..." />
        </div>

        <button type="button" className="ema-icon-btn" onClick={toggleTheme}>
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button type="button" className="ema-icon-btn" aria-label="Notifications">
          <Bell size={17} />
        </button>

        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2 ema-ai-topbar-btn"
          onClick={openEmaAssistant}
        >
          <Sparkles size={17} />
          AI Assistant
        </button>

        <button type="button" className="btn btn-light d-flex align-items-center gap-2">
          <UserCircle size={18} />
          Admin
        </button>
      </header>

      <EmaAssistWidget showFloatingLauncher={false} />
    </>
  );
}

export default TopNavbar;
