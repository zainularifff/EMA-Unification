import { Bell, Moon, Search, Sun, UserCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function TopNavbar() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="app-navbar d-flex align-items-center px-4">
      <div className="d-flex align-items-center gap-3 w-100">
        <div>
          <div className="fw-bold">Welcome back</div>
          <div className="small text-muted">Manage your EMA workspace.</div>
        </div>

        <div className="ms-auto d-none d-md-flex align-items-center position-relative app-navbar-search">
          <Search size={17} className="position-absolute ms-3 text-muted" />
          <input
            className="form-control rounded-pill ps-5"
            placeholder="Search assets, users, devices..."
          />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-light rounded-pill d-inline-flex align-items-center gap-2 app-navbar-theme-toggle"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
          <span className="d-none d-lg-inline">{isDark ? "Light" : "Dark"}</span>
        </button>

        <button className="btn btn-light rounded-circle app-navbar-icon">
          <Bell size={18} />
        </button>

        <button className="btn btn-primary rounded-pill d-flex align-items-center gap-2">
          <UserCircle size={18} />
          <span className="d-none d-sm-inline">Admin</span>
        </button>
      </div>
    </header>
  );
}