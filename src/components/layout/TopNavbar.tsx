import { Bell, Moon, Search, Sparkles, Sun, UserCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getStoredAccessUser, type AccessUser } from "../../routes/accessControl";
import EmaAssistWidget from "../AIAssist/EmaAssistWidget";

type PageMeta = { title: string; subtitle: string; searchPlaceholder: string };

const defaultPageMeta: PageMeta = {
  title: "EMA System",
  subtitle: "Operations Console",
  searchPlaceholder: "Search assets, users, devices...",
};

const pageMeta: Record<string, PageMeta> = {
  "/dashboard": {
    title: "IT OperationDashboard",
    subtitle: "Overview of your EMA workspace.",
    searchPlaceholder: "Search assets, users, devices...",
  },
  "/management-dashboard": {
    title: "Management Dashboard",
    subtitle: "Overview of your EMA workspace.",
    searchPlaceholder: "Search assets, users, devices...",
  },
  "/hardware": {
    title: "Hardware Inventory",
    subtitle: "Track assets, ownership and lifecycle status.",
    searchPlaceholder: "Search asset tag, user, device or IP...",
  },
  "/software": {
    title: "Software Inventory",
    subtitle: "Track applications, versions and classification status.",
    searchPlaceholder: "Search software, publisher, version or device...",
  },
  "/network-inventory": {
    title: "Network Inventory",
    subtitle: "Monitor IP records, workgroups and network coverage.",
    searchPlaceholder: "Search IP, hostname, subnet or workgroup...",
  },
  "/appmetering": {
    title: "Application Metering",
    subtitle: "Review application usage and performance metrics.",
    searchPlaceholder: "Search application, user, device or usage data...",
  },
  "/internet-metering": {
    title: "Internet Metering",
    subtitle: "Review internet usage and performance metrics.",
    searchPlaceholder: "Search internet usage, user, device or usage data...",
  },
  "/app-restriction": {
    title: "Application Restriction",
    subtitle: "Manage and review application restriction policies.",
    searchPlaceholder: "Search applications, users, devices or restriction rules...",
  },
  "/patch-management": {
    title: "Patch Management",
    subtitle: "Manage and deploy software updates and patches.",
    searchPlaceholder: "Search patches, devices, users or update status...",
  },
  "/software-distribution": {
    title: "Software Distribution",
    subtitle: "Manage and deploy software packages and installations.",
    searchPlaceholder: "Search software, users, devices or distribution status...",
  },
  "/service-desk": {
    title: "Service Desk",
    subtitle: "Manage incidents, knowledge base and support workflow.",
    searchPlaceholder: "Search tickets, requester, asset or status...",
  },
  "/tasklist": {
    title: "Task List",
    subtitle: "Monitor command jobs and endpoint execution.",
    searchPlaceholder: "Search task ID, command, state or ordered by...",
  },
    "/settings": {
    title: "Settings",
    subtitle: "Control access, rules and system configuration.",
    searchPlaceholder: "Search settings, roles, users or clients...",
  },
    "/report": {
    title: "Report Center",
    subtitle: "Build management-ready report packs and AI dynamic reports.",
    searchPlaceholder: "Search report packs, AI modules or outputs...",
  },
};

const searchableRoutes = new Set([
  "/dashboard",
  "/hardware",
  "/software",
  "/network",
  "/geolocation",
  "/settings",
  "/service-desk",
  "/tasklist",
  "/report",
  "/reports",
  "/module",
]);

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/dashboard";
  return pathname.replace(/\/+$/, "") || "/dashboard";
}

function resolvePageMeta(pathname: string) {
  const cleanPath = normalizePathname(pathname);
  if (pageMeta[cleanPath]) return pageMeta[cleanPath];

  const matchedBase = Object.keys(pageMeta)
    .sort((a, b) => b.length - a.length)
    .find((route) => cleanPath === route || cleanPath.startsWith(`${route}/`));

  return matchedBase ? pageMeta[matchedBase] : defaultPageMeta;
}

function resolveSearchDestination(pathname: string) {
  const cleanPath = normalizePathname(pathname);
  const matchedBase = Array.from(searchableRoutes)
    .sort((a, b) => b.length - a.length)
    .find((route) => cleanPath === route || cleanPath.startsWith(`${route}/`));

  return matchedBase || "/tasklist";
}

function openEmaAssistant() {
  window.dispatchEvent(new CustomEvent("ema-ai-assist-open"));
}

function emitGlobalSearch(query: string, path: string) {
  window.dispatchEvent(
    new CustomEvent("ema-global-search", {
      detail: {
        query,
        path,
        source: "top-navbar",
      },
    }),
  );
}

function getUrlSearchValue(search: string) {
  const params = new URLSearchParams(search);
  return params.get("q") || params.get("search") || params.get("keyword") || "";
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

function getPrimaryRoleLabel(user: AccessUser | null) {
  const roles = getUserRoles(user);
  return roles[0] || "User";
}

function getFullRoleLabel(user: AccessUser | null) {
  const roles = getUserRoles(user);
  return roles.length > 0 ? roles.join(" • ") : "User";
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

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user: contextUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const meta = useMemo(() => resolvePageMeta(location.pathname), [location.pathname]);
  const accessUser = useMemo(() => mergeAccessUser(contextUser), [contextUser]);
  const displayName = getDisplayName(accessUser);
  const primaryRole = getPrimaryRoleLabel(accessUser);
  const fullRole = getFullRoleLabel(accessUser);

  useEffect(() => {
    setSearchQuery(getUrlSearchValue(location.search));
  }, [location.pathname, location.search]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    const destination = resolveSearchDestination(location.pathname);
    emitGlobalSearch(query, destination);
    navigate(`${destination}?q=${encodeURIComponent(query)}`);
  }

  function clearSearch() {
    setSearchQuery("");
    emitGlobalSearch("", normalizePathname(location.pathname));
    navigate(normalizePathname(location.pathname));
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__heading">
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>

        <form className="topbar__search" onSubmit={handleSearchSubmit}>
          <Search size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={meta.searchPlaceholder}
          />
          {searchQuery ? (
            <button type="button" aria-label="Clear search" onClick={clearSearch}>
              <X size={16} />
            </button>
          ) : null}
        </form>

        <div className="topbar__actions">
          <button type="button" className="icon-btn ai-btn" aria-label="Open EMA Assist" onClick={openEmaAssistant}>
            <Sparkles size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="topbar__user" title={fullRole}>
            <UserCircle size={28} />
            <div>
              <strong>{displayName}</strong>
              <span>{primaryRole}</span>
            </div>
          </div>

          <button type="button" className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <EmaAssistWidget />
    </>
  );
}
