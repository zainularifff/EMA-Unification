import {
  Boxes,
  Gauge,
  Laptop,
  Monitor,
  Network,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/landing", icon: Gauge },
  { label: "Hardware", path: "/ema/hardware", icon: Laptop },
  { label: "Software", path: "/ema/software", icon: Monitor },
  { label: "Network", path: "/ema/network", icon: Network },
  { label: "Users", path: "/users", icon: Users },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="app-sidebar d-flex flex-column p-3">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="app-sidebar-logo">
          <Boxes size={21} />
        </div>

        <div>
          <div className="fw-bold lh-sm">EMA Baru</div>
          <div className="small text-white-50">Asset Console</div>
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
                  "app-sidebar-link nav-link d-flex align-items-center gap-2 px-3 py-2",
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

      <div className="mt-auto pt-3 border-top border-secondary">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center fw-bold" style={{ width: 36, height: 36 }}>
            A
          </div>
          <div>
            <div className="small fw-bold">Admin User</div>
            <div className="small text-white-50">System Manager</div>
          </div>
        </div>

        <button className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2">
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}