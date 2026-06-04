import {
  Bell,
  ChevronDown,
  Moon,
  Search,
  Sun,
  UserCircle,
  Zap,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/landing": {
    title: "Dashboard",
    subtitle: "Overview of your EMA workspace.",
  },
  "/ema/hardware": {
    title: "Hardware Inventory",
    subtitle: "Track assets, ownership and lifecycle status.",
  },
};

export function TopNavbar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const currentPage = pageMeta[location.pathname] || {
    title: "EMA System",
    subtitle: "Manage your workspace.",
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <div className="app-navbar-heading">
          <div className="app-navbar-title">{currentPage.title}</div>
          <div className="app-navbar-subtitle">{currentPage.subtitle}</div>
        </div>

        <div className="app-navbar-search d-none d-md-flex align-items-center position-relative">
          <Search size={17} className="position-absolute ms-3 text-muted" />
          <input
            className="form-control rounded-pill ps-5"
            placeholder="Search assets, users, devices..."
          />
        </div>

        <button className="btn btn-light app-navbar-project d-none d-lg-inline-flex align-items-center gap-2">
          <span className="app-navbar-project-dot" />
          EMA System
          <ChevronDown size={16} />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-light app-navbar-theme-toggle d-inline-flex align-items-center gap-2"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
          <span className="d-none d-lg-inline">{isDark ? "Light" : "Dark"}</span>
        </button>

        <button className="btn btn-light rounded-circle app-navbar-icon">
          <Bell size={18} />
        </button>

        <button className="btn btn-primary rounded-pill d-flex align-items-center gap-2">
          <Zap size={17} />
          <span className="d-none d-xl-inline">Quick Action</span>
        </button>

        <button className="btn btn-light rounded-pill d-inline-flex align-items-center gap-2 app-navbar-user">
          <UserCircle size={19} />
          <span className="d-none d-sm-inline">Admin</span>
        </button>
      </div>
    </header>
  );
}
