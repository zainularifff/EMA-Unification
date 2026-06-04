import {
  BarChart3,
  Box,
  Gauge,
  Laptop,
  LogOut,
  Monitor,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/landing",
    icon: Gauge,
    enabled: true,
  },
  {
    label: "Hardware",
    path: "/ema/hardware",
    icon: Laptop,
    enabled: true,
  },
  {
    label: "Software",
    path: "/ema/software",
    icon: Monitor,
    enabled: false,
  },
  {
    label: "Network",
    path: "/ema/network",
    icon: Wifi,
    enabled: false,
  },
  {
    label: "Users",
    path: "/users",
    icon: Users,
    enabled: false,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    enabled: false,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    enabled: false,
  },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("ema-access-token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("ema-auth");

    navigate("/login", { replace: true });
  };

  return (
    <aside className="app-sidebar d-flex flex-column">
      <div className="app-sidebar-brand">
        <div className="app-sidebar-logo">
          <Box size={21} />
        </div>

        <div>
          <div className="app-sidebar-title">EMA System</div>
          <div className="app-sidebar-subtitle">Asset Console</div>
        </div>
      </div>

      <nav className="app-sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.path}
                className="app-sidebar-link app-sidebar-link-disabled d-flex align-items-center gap-2"
                title="Coming soon"
              >
                <Icon size={17} />
                <span>{item.label}</span>
                <span className="ms-auto app-sidebar-soon">Soon</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "app-sidebar-link d-flex align-items-center gap-2 text-decoration-none",
                  isActive ? "active" : "",
                ].join(" ")
              }
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-user">
          <div className="app-sidebar-avatar">
            <ShieldCheck size={17} />
          </div>

          <div className="min-w-0">
            <div className="app-sidebar-user-name">Admin User</div>
            <div className="app-sidebar-user-role">System Manager</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
