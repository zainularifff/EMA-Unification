import { useEffect, useState } from "react";
import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy";

function readInitialView(): SettingsView {
  if (typeof window === "undefined") return "settings";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const tab = String(query.get("tab") || "").toLowerCase();
  if (hash.includes("notification") || tab.includes("notification")) return "notifications";
  if (hash.includes("management") || tab.includes("management")) return "management";
  return "settings";
}

function readManagementSection(): ManagementSection {
  if (typeof window === "undefined") return "aging";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const section = `${query.get("section") || ""} ${hash}`.toLowerCase();
  if (section.includes("pricing")) return "pricing";
  if (section.includes("policy")) return "policy";
  return "aging";
}

function setImportantStyle(element: HTMLElement | null | undefined, styles: Record<string, string>) {
  if (!element) return;
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, "important");
  });
}

function applyLegacySettingsUiFixes() {
  if (typeof document === "undefined") return;

  const host = document.querySelector<HTMLElement>(".settings-view-host");
  const root = host?.querySelector<HTMLElement>(".settings-module-root");
  if (!host || !root) return;

  setImportantStyle(host, {
    minHeight: "0",
    overflow: "hidden",
  });

  setImportantStyle(root, {
    width: "100%",
    height: "100%",
    minHeight: "0",
    overflow: "hidden",
    padding: "0",
    background: "transparent",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".settings-layout"), {
    display: "grid",
    gridTemplateColumns: "20rem minmax(0, 1fr)",
    gap: "0.75rem",
    width: "100%",
    height: "100%",
    minHeight: "0",
    maxHeight: "none",
    overflow: "hidden",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".settings-menu"), {
    width: "20rem",
    maxWidth: "20rem",
    minHeight: "0",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "1rem",
    padding: "0.85rem",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".settings-menu-list"), {
    display: "grid",
    gridTemplateColumns: "1fr",
    alignContent: "start",
    gap: "0.45rem",
    flex: "1 1 auto",
    minHeight: "0",
    overflow: "auto",
    margin: "0",
    padding: "0.25rem 0.2rem 0 0",
    border: "0",
    background: "transparent",
  });

  root.querySelectorAll<HTMLElement>(".setting-btn").forEach((button) => {
    setImportantStyle(button, {
      width: "100%",
      minHeight: "3.15rem",
      display: "grid",
      gridTemplateColumns: "2.1rem minmax(0, 1fr)",
      alignItems: "center",
      justifyContent: "stretch",
      gap: "0.65rem",
      padding: "0.55rem 0.65rem",
      borderRadius: "0.85rem",
      textAlign: "left",
      lineHeight: "1.1",
      whiteSpace: "normal",
    });
  });

  root.querySelectorAll<HTMLElement>(".setting-btn span:last-child, .setting-btn strong, .setting-btn small").forEach((node) => {
    setImportantStyle(node, {
      minWidth: "0",
      overflow: "hidden",
      textOverflow: "ellipsis",
    });
  });

  root.querySelectorAll<HTMLElement>(".setting-btn strong").forEach((node) => {
    setImportantStyle(node, {
      display: "block",
      fontSize: "0.78rem",
      fontWeight: "950",
      whiteSpace: "nowrap",
    });
  });

  root.querySelectorAll<HTMLElement>(".setting-btn small").forEach((node) => {
    setImportantStyle(node, {
      display: "-webkit-box",
      WebkitLineClamp: "2",
      WebkitBoxOrient: "vertical",
      fontSize: "0.68rem",
      fontWeight: "700",
      whiteSpace: "normal",
      lineHeight: "1.15",
    });
  });

  root.querySelectorAll<HTMLElement>(".setting-icon").forEach((icon) => {
    setImportantStyle(icon, {
      width: "2.1rem",
      height: "2.1rem",
      flex: "0 0 2.1rem",
      display: "inline-grid",
      placeItems: "center",
      borderRadius: "0.7rem",
    });
  });

  setImportantStyle(root.querySelector<HTMLElement>(".settings-content"), {
    minWidth: "0",
    minHeight: "0",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    overflow: "hidden",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".settings-hero"), {
    display: "grid",
    gridTemplateColumns: "minmax(12rem, 18rem) minmax(0, 1fr)",
    alignItems: "stretch",
    gap: "0.75rem",
    flex: "0 0 auto",
    padding: "0.85rem",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".settings-score"), {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.65rem",
    minWidth: "0",
  });

  root.querySelectorAll<HTMLElement>(".score-box").forEach((box) => {
    setImportantStyle(box, {
      minWidth: "0",
      minHeight: "4.35rem",
      border: "1px solid #dbe7f5",
      borderRadius: "0.9rem",
      background: "#ffffff",
      padding: "0.65rem",
    });
  });

  root.querySelectorAll<HTMLElement>(".score-box span, .score-box strong, .score-box small").forEach((node) => {
    setImportantStyle(node, {
      display: "block",
      minWidth: "0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });

  setImportantStyle(root.querySelector<HTMLElement>(".content-shell"), {
    flex: "1 1 auto",
    minWidth: "0",
    minHeight: "0",
    height: "auto",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "0",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".content-toolbar"), {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.75rem",
    flex: "0 0 auto",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".content-body"), {
    flex: "1 1 auto",
    minHeight: "0",
    overflow: "auto",
    padding: "0.75rem",
  });

  root.querySelectorAll<HTMLElement>(".section-search").forEach((search) => {
    setImportantStyle(search, {
      width: "100%",
      minWidth: "0",
      height: "2.55rem",
      display: "flex",
      alignItems: "center",
      gap: "0.55rem",
      overflow: "hidden",
    });
  });

  root.querySelectorAll<HTMLElement>(".section-search input").forEach((input) => {
    setImportantStyle(input, {
      flex: "1 1 auto",
      minWidth: "0",
      width: "100%",
      border: "0",
      outline: "0",
      background: "transparent",
    });
  });

  root.querySelectorAll<SVGElement>(".section-search svg, .uam-filter-trigger svg, .setting-select-trigger svg").forEach((svg) => {
    svg.style.setProperty("width", "1rem", "important");
    svg.style.setProperty("height", "1rem", "important");
    svg.style.setProperty("min-width", "1rem", "important");
    svg.style.setProperty("max-width", "1rem", "important");
  });

  root.querySelectorAll<HTMLElement>(".soft-btn, .primary-btn, .danger-btn").forEach((button) => {
    setImportantStyle(button, {
      width: "auto",
      minHeight: "2.35rem",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.45rem",
      padding: "0 0.9rem",
      borderRadius: "0.78rem",
      whiteSpace: "nowrap",
    });
  });

  setImportantStyle(root.querySelector<HTMLElement>(".uam-panel"), {
    display: "grid",
    gap: "0.75rem",
    minHeight: "0",
  });

  setImportantStyle(root.querySelector<HTMLElement>(".user-access-table"), {
    width: "100%",
    overflow: "auto",
    borderRadius: "0.95rem",
  });

  root.querySelectorAll<HTMLElement>(".role-standard-row").forEach((row) => {
    setImportantStyle(row, {
      display: "grid",
      gridTemplateColumns: "3.5rem minmax(20rem, 1fr) 10rem 10rem 8rem",
      alignItems: "center",
      minWidth: "62rem",
      minHeight: "3.05rem",
    });
  });

  root.querySelectorAll<HTMLElement>(".user-row.head").forEach((row) => {
    setImportantStyle(row, {
      minHeight: "3rem",
    });
  });

  root.querySelectorAll<HTMLElement>(".user-cell").forEach((cell) => {
    setImportantStyle(cell, {
      minWidth: "0",
      padding: "0.65rem 0.75rem",
      fontSize: "0.82rem",
      lineHeight: "1.25",
    });
  });

  root.querySelectorAll<HTMLElement>(".role-info-cell strong, .role-info-cell small").forEach((node) => {
    setImportantStyle(node, {
      display: "block",
      minWidth: "0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });

  root.querySelectorAll<HTMLElement>(".row-actions, .user-row-action-wrap").forEach((actions) => {
    setImportantStyle(actions, {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
    });
  });

  root.querySelectorAll<HTMLElement>(".mini-btn.icon-only, .icon-delete-btn").forEach((button) => {
    setImportantStyle(button, {
      width: "2rem",
      height: "2rem",
      minHeight: "2rem",
      display: "inline-grid",
      placeItems: "center",
      padding: "0",
      borderRadius: "0.65rem",
      overflow: "hidden",
    });
  });

  root.querySelectorAll<SVGElement>(".mini-btn svg, .icon-delete-btn svg").forEach((svg) => {
    svg.style.setProperty("width", "1rem", "important");
    svg.style.setProperty("height", "1rem", "important");
    svg.style.setProperty("min-width", "1rem", "important");
    svg.style.setProperty("max-width", "1rem", "important");
  });
}

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);
  const [managementSection, setManagementSection] = useState<ManagementSection>(readManagementSection);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.settingsView = view;
    document.documentElement.dataset.settingsView = view;

    return () => {
      if (document.body.dataset.settingsView === view) delete document.body.dataset.settingsView;
      if (document.documentElement.dataset.settingsView === view) delete document.documentElement.dataset.settingsView;
    };
  }, [view]);

  useEffect(() => {
    if (view === "notifications" || typeof document === "undefined") return;

    const apply = () => window.requestAnimationFrame(applyLegacySettingsUiFixes);
    apply();

    const host = document.querySelector(".settings-view-host");
    const observer = new MutationObserver(apply);
    if (host) observer.observe(host, { childList: true, subtree: true });

    const timer = window.setInterval(applyLegacySettingsUiFixes, 250);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [view, managementSection]);

  useEffect(() => {
    const onHashChange = () => {
      setView(readInitialView());
      setManagementSection(readManagementSection());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (view !== "management") return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLButtonElement>(`.management-control-wrapper .setting-btn[data-section="${managementSection}"]`);
      target?.click();
      applyLegacySettingsUiFixes();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view, managementSection]);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : next === "management" ? `#management-control-${managementSection}` : "";
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
  };

  return (
    <div className={`ema-module-root settings-with-notifications settings-view-${view}`} data-settings-view={view} data-section="settings">
      <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Settings Center</p>
            <h1 className="mt-1 text-xl font-black text-slate-950">Configuration Area</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">Manage access, policy and notification settings.</p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button className={`rounded-xl px-4 py-2 text-sm font-black transition ${view === "settings" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"}`} onClick={() => switchView("settings")}>Settings Console</button>
            <button className={`rounded-xl px-4 py-2 text-sm font-black transition ${view === "management" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"}`} onClick={() => switchView("management")}>Management Control</button>
            <button className={`rounded-xl px-4 py-2 text-sm font-black transition ${view === "notifications" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"}`} onClick={() => switchView("notifications")}>Notification Channels</button>
          </div>
        </div>

        <div className="settings-view-host min-h-0 flex-1 overflow-hidden">
          {view === "notifications" ? (
            <NotificationChannelsSettings />
          ) : view === "management" ? (
            <div className="management-control-wrapper h-full min-h-0" data-management-section={managementSection}>
              <LegacySettings key={`management-${managementSection}`} />
            </div>
          ) : (
            <LegacySettings />
          )}
        </div>
      </div>
    </div>
  );
}
