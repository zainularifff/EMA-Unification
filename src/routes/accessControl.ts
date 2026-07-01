export type AccessUser = Record<string, any>;

export const PUBLIC_AUTH_PATHS = ["/login"];

export const MODULE_ROUTE_MAP: Record<string, string> = {
  management_dashboard: "/management-dashboard",
  managementdashboard: "/management-dashboard",

  it_operations_dashboard: "/dashboard",
  operations_dashboard: "/dashboard",
  dashboard: "/dashboard",

  hardware: "/hardware",
  hardware_inventory: "/hardware",

  software: "/software",
  software_inventory: "/software",

  network: "/network-inventory",
  network_inventory: "/network-inventory",
  network_metering: "/network-metering",

  service_desk: "/service-desk",
  servicedesk: "/service-desk",

  tasklist: "/tasklist",
  task_list: "/tasklist",

  report: "/report",
  reports: "/report",

  settings: "/settings",

  appmetering: "/appmetering",
  app_metering: "/appmetering",

  app_restriction: "/app-restriction",
  web_restriction: "/web-restriction",

  software_distribution: "/software-distribution",
  patch_management: "/patch-management",
  internet_metering: "/internet-metering",
};

export const DEFAULT_ROUTE_ORDER = [
  "/management-dashboard",
  "/dashboard",
  "/hardware",
  "/software",
  "/network-inventory",
  "/network-metering",
  "/service-desk",
  "/tasklist",
  "/report",
  "/appmetering",
  "/app-restriction",
  "/web-restriction",
  "/software-distribution",
  "/patch-management",
  "/internet-metering",
  "/settings",
];

function safeParse(raw: string | null) {
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function boolValue(value: any) {
  if (value === true || value === 1) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(text);
}

function normalizeText(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cleanPath(pathname = "") {
  const path = String(pathname || "/").split("?")[0].split("#")[0];
  if (!path || path === "/") return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function extractUser(source?: any): AccessUser | null {
  return (
    source?.user ||
    source?.data?.user ||
    source?.data ||
    source?.profile ||
    getStoredAccessUser()
  );
}

export function saveAccessUser(user: AccessUser | null | undefined) {
  if (typeof window === "undefined" || !user) return;

  try {
    const raw = safeParse(localStorage.getItem("ema-auth")) || {};
    localStorage.setItem(
      "ema-auth",
      JSON.stringify({
        ...raw,
        user,
      })
    );
  } catch {
    // ignore
  }
}

export function getStoredAccessUser(): AccessUser | null {
  if (typeof window === "undefined") return null;

  const keys = [
    "ema-auth",
    "user",
    "authUser",
    "currentUser",
    "emaUser",
    "ema-user",
    "userData",
    "auth",
    "authData",
    "loginUser",
  ];

  for (const key of keys) {
    const parsed =
      safeParse(localStorage.getItem(key)) ||
      safeParse(sessionStorage.getItem(key));

    if (!parsed) continue;

    const user =
      parsed.user ||
      parsed.data?.user ||
      parsed.data ||
      parsed.profile ||
      parsed;

    if (user && typeof user === "object") return user;
  }

  return null;
}

export function getUserRoleIds(user?: AccessUser | null) {
  const values = [
    user?.roleID,
    user?.RoleID,
    user?.roleId,
    user?.RoleId,
    user?.role?.RoleID,
    user?.role?.roleID,
    user?.data?.RoleID,
    user?.data?.roleID,
  ];

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role: any) => {
      values.push(role?.RoleID, role?.roleID, role?.id, role);
    });
  }

  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function getUserRoles(user?: AccessUser | null) {
  const values = [
    user?.RoleName,
    user?.roleName,
    user?.role,
    user?.Role,
    user?.role?.RoleName,
    user?.role?.name,
    user?.Name,
    user?.name,
  ];

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role: any) => {
      values.push(role?.RoleName, role?.roleName, role?.name, role);
    });
  }

  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? "").split(/[,|;]/))
        .map(normalizeText)
        .filter(Boolean)
    )
  );
}

function getRawPermissionRows(user?: AccessUser | null): any[] {
  const sources = [
    user?.modulePermissions,
    user?.roleModulePermissions,
    user?.RoleModulePermissions,
    user?.permissions?.modules,
    user?.permissions?.modulePermissions,
    user?.data?.modulePermissions,
    user?.data?.roleModulePermissions,
  ];

  for (const source of sources) {
    if (Array.isArray(source)) return source;
  }

  return [];
}

function getRawModuleRows(user?: AccessUser | null): any[] {
  const sources = [
    user?.modules,
    user?.allowedModules,
    user?.moduleAccess,
    user?.data?.modules,
    user?.data?.allowedModules,
  ];

  for (const source of sources) {
    if (Array.isArray(source)) return source;
    if (source && typeof source === "object") return Object.values(source);
  }

  return [];
}

function getPermissionRoleId(row: any) {
  return String(row?.RoleID ?? row?.roleID ?? row?.roleId ?? "").trim();
}

function getPermissionModuleId(row: any) {
  return String(row?.ModuleID ?? row?.moduleID ?? row?.moduleId ?? row?.id ?? "").trim();
}

function permissionAllowsView(row: any) {
  const canAccess = row?.CanAccess ?? row?.canAccess ?? row?.access;
  const canView = row?.CanView ?? row?.canView ?? row?.view;
  const isEnabled = row?.IsEnabled ?? row?.isEnabled ?? row?.enabled;

  return boolValue(canAccess) && boolValue(canView) && (isEnabled === undefined || isEnabled === null || boolValue(isEnabled));
}

function getModuleRoute(row: any) {
  const direct =
    row?.routePath ||
    row?.RoutePath ||
    row?.route ||
    row?.Route ||
    row?.path ||
    row?.Path ||
    "";

  if (String(direct).startsWith("/")) return cleanPath(String(direct));

  const key = normalizeText(
    row?.ModuleKey ||
      row?.moduleKey ||
      row?.ModuleName ||
      row?.moduleName ||
      row?.Name ||
      row?.name ||
      row?.module ||
      row?.label ||
      ""
  );

  return MODULE_ROUTE_MAP[key] || "";
}

export function getRouteModuleKeys(pathname = "") {
  const path = cleanPath(pathname);

  return Object.entries(MODULE_ROUTE_MAP)
    .filter(([, route]) => cleanPath(route) === path || path.startsWith(cleanPath(route) + "/"))
    .map(([key]) => key);
}

function resolveAllowedRoutesFromPermissionRows(user?: AccessUser | null) {
  const roleIds = getUserRoleIds(user);
  const permissionRows = getRawPermissionRows(user);
  const moduleRows = getRawModuleRows(user);

  const moduleById = new Map<string, any>();

  moduleRows.forEach((module) => {
    const id = String(module?.ModuleID ?? module?.moduleID ?? module?.moduleId ?? module?.id ?? "").trim();
    if (id) moduleById.set(id, module);
  });

  const routes = permissionRows
    .filter((row) => {
      const rowRoleId = getPermissionRoleId(row);

      if (roleIds.length > 0 && rowRoleId && !roleIds.includes(rowRoleId)) {
        return false;
      }

      return permissionAllowsView(row);
    })
    .map((row) => {
      const moduleId = getPermissionModuleId(row);
      const module = moduleById.get(moduleId) || row;
      return getModuleRoute(module);
    })
    .filter(Boolean);

  return Array.from(new Set(routes));
}

export function getAllowedRoutesForUser(user?: AccessUser | null) {
  const realUser = user || getStoredAccessUser();

  if (!realUser) return [];

  const permissionRoutes = resolveAllowedRoutesFromPermissionRows(realUser);

  // Main rule: use EMA_RoleModulePermissions rows only.
  if (permissionRoutes.length > 0) {
    return permissionRoutes;
  }

  // Fallback only for old backend payload that already sends allowedRoutes.
  // Do not trust wildcard for non-system role.
  const allowedRoutes = Array.isArray(realUser.allowedRoutes)
    ? realUser.allowedRoutes.map(String).filter((route) => route.startsWith("/"))
    : [];

  if (allowedRoutes.length > 0) {
    return Array.from(new Set(allowedRoutes.map(cleanPath)));
  }

  return [];
}

export function canAccessRoute(user: AccessUser | null | undefined, pathname: string) {
  const path = cleanPath(pathname);

  if (path === "/" || PUBLIC_AUTH_PATHS.includes(path)) return true;

  const routes = getAllowedRoutesForUser(user);

  return routes.some((route) => {
    const allowed = cleanPath(route);
    // Allow exact match, sub-path access (user at /settings/roles can reach /settings)
    return path === allowed || path.startsWith(allowed + "/") || allowed.startsWith(path + "/");
  });
}

export function canViewPath(
  pathOrUser: string | AccessUser | null | undefined,
  userOrPath?: AccessUser | string | null
) {
  const path =
    typeof pathOrUser === "string"
      ? pathOrUser
      : typeof userOrPath === "string"
        ? userOrPath
        : "";

  const user =
    typeof pathOrUser === "string"
      ? typeof userOrPath === "object" && userOrPath
        ? userOrPath
        : getStoredAccessUser()
      : pathOrUser || getStoredAccessUser();

  return canAccessRoute(user, path);
}

export const canViewRoute = canViewPath;

export function getDefaultRouteForUser(user?: AccessUser | null) {
  const routes = getAllowedRoutesForUser(user);

  for (const route of DEFAULT_ROUTE_ORDER) {
    if (routes.some((allowed) => {
      const a = cleanPath(allowed);
      // Also match if user has a sub-path of this route (e.g., /settings/roles → /settings)
      return a === route || a.startsWith(route + "/");
    })) {
      return route;
    }
  }

  // Normalize first route to its nearest parent in DEFAULT_ROUTE_ORDER
  if (routes.length > 0) {
    const first = cleanPath(routes[0]);
    for (const route of DEFAULT_ROUTE_ORDER) {
      if (first === route || first.startsWith(route + "/")) return route;
    }
    return routes[0];
  }

  return "/login";
}

export const getAccessLandingPath = getDefaultRouteForUser;

export function isSuperAccessUser(user?: AccessUser | null) {
  return getUserRoles(user).some((role) =>
    ["super_admin", "superadmin", "system_administrator", "system_admin"].includes(role)
  );
}
