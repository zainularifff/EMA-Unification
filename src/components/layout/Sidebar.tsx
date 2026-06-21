import {
  Activity,
  BarChart3,
  Box,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Globe2,
  HardDrive,
  Headset,
  LayoutDashboard,
  LogOut,
  Monitor,
  Network,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { canViewPath, getStoredAccessUser, type AccessUser } from "../../routes/accessControl";

type NavItem = {
  label: string;
  path: string;
  icon: typeof Gauge;
  comingSoon?: boolean;
};

type NavSection = {
  title: string;
  icon: typeof Gauge;
  items: NavItem[];
  collapsible?: boolean;
};

const navSections: NavSection[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    collapsible: true,
    items: [
      { label: "IT Operation Dashboard", path: "/dashboard", icon: Gauge },
      { label: "Management Dashboard", path: "/management-dashboard", icon: BarChart3 },
    ],
  },
  {
    title: "Module",
    icon: Boxes,
    collapsible: true,
    items: [
      { label: "Hardware Inventory", path: "/hardware", icon: HardDrive },
      { label: "Software Inventory", path: "/software", icon: Monitor },
      { label: "Network Inventory", path: "/network-inventory", icon: Network },
      { label: "App Metering", path: "/appmetering", icon: Activity },
      { label: "Internet Metering", path: "/internet-metering", icon: Globe2 },
      { label: "App Restriction", path: "/app-restriction", icon: ShieldOff },
      { label: "Web Restriction", path: "/web-restriction", icon: Globe2 },
      { label: "Patch Management", path: "/patch-management", icon: ShieldCheck },
      { label: "Software Distribution", path: "/software-distribution", icon: PackageCheck },
      { label: "Task List", path: "/tasklist", icon: ClipboardList },
    ],
  },
  {
    title: "Report",
    icon: FileText,
    items: [{ label: "Report", path: "/report", icon: FileText }],
  },
  {
    title: "Service Desk",
    icon: Headset,
    items: [{ label: "Service Desk", path: "/service-desk", icon: Headset }],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [{ label: "Settings", path: "/settings", icon: Settings }],
  },
];

function isRouteActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function mergeAccessUser(contextUser: unknown): AccessUser | null {
  const storedUser = getStoredAccessUser();

  if (!contextUser || typeof contextUser !== "object") {
    return storedUser;
  }

  return {
    ...(storedUser || {}),
    ...(contextUser as AccessUser),
    roles: (contextUser as AccessUser).roles || storedUser?.roles,
    role: (contextUser as AccessUser).role || storedUser?.role,
    roleName: (contextUser as AccessUser).roleName || storedUser?.roleName,
    allowedModules: (contextUser as AccessUser).allowedModules || storedUser?.allowedModules,
    allowedRoutes: (contextUser as AccessUser).allowedRoutes || storedUser?.allowedRoutes,
    moduleAccess: (contextUser as AccessUser).moduleAccess || storedUser?.moduleAccess,
    permissions: (contextUser as AccessUser).permissions || storedUser?.permissions,
  };
}

function splitRoleText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUserRoles(user: AccessUser | null): string[] {
  const roles = [
    ...splitRoleText((user as any)?.roles),
    ...splitRoleText((user as any)?.roleName),
    ...splitRoleText((user as any)?.role),
  ];

  const seen = new Set<string>();
  return roles.filter((role) => {
    const key = role.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getDisplayName(user: AccessUser | null) {
  return (
    (user as any)?.name ||
    (user as any)?.fullName ||
    (user as any)?.username ||
    (user as any)?.userID ||
    "Current user"
  );
}

function getSidebarRoleLabel(user: AccessUser | null) {
  const roles = getUserRoles(user);

  if (roles.length === 0) return "User";
  if (roles.length === 1) return roles[0];
  if (roles.length === 2) return roles.join(" • ");

  return `${roles[0]} +${roles.length - 1}`;
}

const sidebarLinkBase =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white";
const sidebarLinkActive = "bg-white text-slate-950 shadow-lg hover:bg-white hover:text-slate-950";
const sidebarLinkMuted = "opacity-50";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const accessUser = mergeAccessUser(user);

  const activeSectionTitle = useMemo(() => {
    const activeSection = navSections.find((section) =>
      section.items.some((item) => isRouteActive(location.pathname, item.path))
    );

    return activeSection?.title || "Dashboard";
  }, [location.pathname]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string>("");

  useEffect(() => {
    if (!isSidebarOpen) return;

    const activeSection = navSections.find((section) =>
      section.collapsible && section.items.some((item) => isRouteActive(location.pathname, item.path))
    );

    if (activeSection) {
      setOpenSection(activeSection.title);
    }
  }, [location.pathname, isSidebarOpen]);

  const toggleSection = (sectionTitle: string) => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
      setOpenSection(sectionTitle);
      return;
    }

    setOpenSection((current) => (current === sectionTitle ? "" : sectionTitle));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((current) => {
      const next = !current;
      if (next && !openSection) {
        setOpenSection(activeSectionTitle);
      }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = getDisplayName(accessUser);
  const roleLabel = getSidebarRoleLabel(accessUser);
  const fullRoleLabel = getUserRoles(accessUser).join(" • ") || roleLabel;
  const asideWidthClass = isSidebarOpen ? "w-72 px-4" : "w-20 px-3";
  const iconOnlyLinkClass = !isSidebarOpen ? "justify-center px-0" : "";

  return (
    <aside
      className={`sticky top-0 flex h-screen ${asideWidthClass} shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-slate-950 py-5 text-slate-100 shadow-2xl transition-all duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
    >
      <div className={`mb-6 flex items-center ${isSidebarOpen ? "gap-3" : "justify-center"}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
          <Box size={23} />
        </div>

        {isSidebarOpen && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-extrabold tracking-tight text-white">EMA System</div>
            <div className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">Operations Console</div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white hover:text-slate-950"
          title={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {isSidebarOpen && <div className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Main Category</div>}

      <nav className="flex flex-1 flex-col gap-1">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = isSidebarOpen && openSection === section.title;
          const hasActiveItem = section.items.some((item) => isRouteActive(location.pathname, item.path));

          if (!section.collapsible) {
            const item = section.items[0];
            const Icon = item.icon;
            const hasAccess = canViewPath(accessUser, item.path);
            const isDisabled = item.comingSoon || !hasAccess;
            const isActive = isRouteActive(location.pathname, item.path);

            if (isDisabled) {
              return (
                <div
                  key={section.title}
                  className={`${sidebarLinkBase} ${iconOnlyLinkClass} ${sidebarLinkMuted}`}
                  title={item.comingSoon ? "Coming soon" : "Access restricted"}
                >
                  <Icon size={17} />
                  {isSidebarOpen && <span className="min-w-0 flex-1 truncate">{section.title}</span>}
                  {isSidebarOpen && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      {item.comingSoon ? "Soon" : "Locked"}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={section.title}
                to={item.path}
                title={!isSidebarOpen ? section.title : undefined}
                className={`${sidebarLinkBase} ${iconOnlyLinkClass} ${isActive ? sidebarLinkActive : ""}`}
              >
                <Icon size={17} />
                {isSidebarOpen && <span className="min-w-0 truncate">{section.title}</span>}
              </NavLink>
            );
          }

          return (
            <div key={section.title} className="grid gap-1">
              <button
                type="button"
                className={`${sidebarLinkBase} ${iconOnlyLinkClass} border-0 ${hasActiveItem && !isOpen ? sidebarLinkActive : ""}`}
                onClick={() => toggleSection(section.title)}
                aria-expanded={isOpen}
                aria-controls={`sidebar-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
                title={!isSidebarOpen ? section.title : undefined}
              >
                <SectionIcon size={17} />
                {isSidebarOpen && <span className="min-w-0 flex-1 truncate text-left">{section.title}</span>}
                {isSidebarOpen && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>

              {isOpen && (
                <div
                  id={`sidebar-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
                  className="mb-1 grid gap-1 pl-4"
                >
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const hasAccess = canViewPath(accessUser, item.path);
                    const isDisabled = item.comingSoon || !hasAccess;
                    const isActive = isRouteActive(location.pathname, item.path);

                    if (isDisabled) {
                      return (
                        <div
                          key={item.path}
                          className={`${sidebarLinkBase} ${sidebarLinkMuted}`}
                          title={item.comingSoon ? "Coming soon" : "Access restricted"}
                        >
                          <Icon size={16} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                            {item.comingSoon ? "Soon" : "Locked"}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`${sidebarLinkBase} ${isActive ? sidebarLinkActive : ""}`}
                      >
                        <Icon size={16} />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
        <div
          className={`flex min-w-0 items-center ${isSidebarOpen ? "gap-3 p-3" : "justify-center p-2"} rounded-2xl bg-white/10 ring-1 ring-white/10`}
          title={`${displayName} • ${fullRoleLabel}`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
            <ShieldCheck size={18} />
          </div>

          {isSidebarOpen && (
            <div className="min-w-0">
              <div className="truncate font-bold leading-tight text-white">{displayName}</div>
              <div className="truncate text-xs text-slate-400">{roleLabel}</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={`${isSidebarOpen ? "w-full justify-center px-4" : "w-11 justify-center px-0"} inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white text-sm font-bold text-slate-950 transition hover:bg-slate-100`}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={17} />
          {isSidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
