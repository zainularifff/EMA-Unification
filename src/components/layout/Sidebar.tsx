import { Box, Home, Laptop, LogOut, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/landing",
    icon: Home,
  },
  {
    label: "Hardware Inventory",
    path: "/ema/hardware",
    icon: Laptop,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  return (
    <aside className="app-sidebar d-flex flex-column p-3">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="app-sidebar-logo">
          <Box size={22} />
        </div>

        <div>
          <div className="fw-bold lh-sm">EMA System</div>
          <div className="small text-white-50">Operations Console</div>
        </div>
      </div>

      <nav className="nav nav-pills flex-column gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "app-sidebar-link nav-link d-flex align-items-center gap-2 rounded-3 px-3 py-2",
                  isActive ? "active" : "text-white-50",
                ].join(" ")
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-3 border-top border-secondary">
        <button className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}