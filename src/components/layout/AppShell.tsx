import { useEffect, type WheelEvent } from "react";
import { Outlet } from "react-router-dom";

import { installDisplayCopyStandardizer } from "../../utils/displayCopy";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import "./app-shell-scroll-fix.css";

declare global {
  interface Window {
    __emaSettingsRoleRefreshGuardInstalled?: boolean;
    __emaSettingsRoleLastWriteAt?: number;
    __emaSettingsRoleCache?: unknown[];
    __emaSettingsRoleCacheAt?: number;
  }
}

function getNestedVerticalScroller(target: HTMLElement | null, stopAt: HTMLElement) {
  let current = target;

  while (current && current !== stopAt) {
    const style = window.getComputedStyle(current);
    const canScrollY = /(auto|scroll)/i.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1;
    if (canScrollY) return current;
    current = current.parentElement;
  }

  return null;
}

function normalizeWheelDelta(event: WheelEvent<HTMLElement>) {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * event.currentTarget.clientHeight;
  return event.deltaY;
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isObjectPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readRoleRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isObjectPayload(payload)) return [];

  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (isObjectPayload(data) && Array.isArray(data.roles)) return data.roles;
  if (Array.isArray(payload.roles)) return payload.roles;
  if (Array.isArray(payload.rows)) return payload.rows;

  return [];
}

function cacheRoleRows(payload: unknown) {
  const rows = readRoleRows(payload);
  if (!rows.length) return;

  window.__emaSettingsRoleCache = rows;
  window.__emaSettingsRoleCacheAt = Date.now();
}

function patchModuleAccessRoles(payload: unknown) {
  const cachedRoles = window.__emaSettingsRoleCache;
  if (!Array.isArray(cachedRoles) || !cachedRoles.length || !isObjectPayload(payload)) return payload;

  const data = isObjectPayload(payload.data) ? payload.data : {};

  return {
    ...payload,
    data: {
      ...data,
      roles: cachedRoles,
    },
  };
}

function jsonResponseFrom(original: Response, payload: unknown) {
  const headers = new Headers(original.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(payload), {
    status: original.status,
    statusText: original.statusText,
    headers,
  });
}

async function readJsonSafely(response: Response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function installSettingsRoleRefreshGuard() {
  if (typeof window === "undefined" || window.__emaSettingsRoleRefreshGuardInstalled) return;

  window.__emaSettingsRoleRefreshGuardInstalled = true;
  window.__emaSettingsRoleLastWriteAt = 0;
  window.__emaSettingsRoleCache = [];
  window.__emaSettingsRoleCacheAt = 0;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getRequestUrl(input);
    const method = getRequestMethod(input, init);
    const isRoleApi = url.includes("/api/settings/roles");
    const isModuleAccessApi = url.includes("/api/settings/module-access");

    if (isRoleApi && method === "GET") {
      const lastWriteAt = Number(window.__emaSettingsRoleLastWriteAt || 0);
      const elapsed = Date.now() - lastWriteAt;

      if (lastWriteAt > 0 && elapsed >= 0 && elapsed < 450) {
        await delay(450 - elapsed);
      }
    }

    const response = await originalFetch(input, init);

    if (isRoleApi && method === "GET" && response.ok) {
      const payload = await readJsonSafely(response);
      cacheRoleRows(payload);
      return response;
    }

    if (isRoleApi && ["POST", "PUT", "PATCH", "DELETE"].includes(method) && response.ok) {
      window.__emaSettingsRoleLastWriteAt = Date.now();
      return response;
    }

    if (isModuleAccessApi && method === "GET" && response.ok) {
      const payload = await readJsonSafely(response);
      const patchedPayload = patchModuleAccessRoles(payload);
      if (patchedPayload !== payload) return jsonResponseFrom(response, patchedPayload);
    }

    return response;
  };
}

export function AppShell() {
  useEffect(() => {
    installDisplayCopyStandardizer();
    installSettingsRoleRefreshGuard();
  }, []);

  const handleMainWheel = (event: WheelEvent<HTMLElement>) => {
    const main = event.currentTarget;
    if (!main || Math.abs(event.deltaY) < 1) return;

    const nestedScroller = getNestedVerticalScroller(event.target as HTMLElement | null, main);
    if (nestedScroller) return;

    const maxScrollTop = main.scrollHeight - main.clientHeight;
    if (maxScrollTop <= 0) return;

    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, main.scrollTop + normalizeWheelDelta(event)));
    if (nextScrollTop === main.scrollTop) return;

    main.scrollTop = nextScrollTop;
    event.preventDefault();
  };

  return (
    <div className="ema-app-shell-root flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="ema-app-shell-sidebar h-screen flex-shrink-0 overflow-hidden">
        <Sidebar />
      </div>

      <div className="ema-app-shell-content flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar />

        <main className="ema-app-shell-main min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2" onWheelCapture={handleMainWheel}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
