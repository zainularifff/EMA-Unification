import { useEffect, useState } from "react";
import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "incident" | "pricing" | "aging" | "policy" | "softwarePolicy";

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
  if (typeof window === "undefined") return "incident";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const section = `${query.get("section") || ""} ${hash}`.toLowerCase();
  if (section.includes("software")) return "softwarePolicy";
  if (section.includes("pricing")) return "pricing";
  if (section.includes("aging")) return "aging";
  if (section.includes("policy")) return "policy";
  return "incident";
}

function getManagementHash(section: ManagementSection) {
  if (section === "softwarePolicy") return "#management-control-software-policy";
  return `#management-control-${section}`;
}

function findManagementSectionButton(section: ManagementSection) {
  const candidates = section === "softwarePolicy"
    ? ["softwarePolicy", "software-policy", "software", "softwarePolicySetting", "software_registry"]
    : [section];

  for (const key of candidates) {
    const button = document.querySelector<HTMLButtonElement>(`.management-control-wrapper .setting-btn[data-section="${key}"], .settings-view-host .setting-btn[data-section="${key}"]`);
    if (button) return button;
  }

  if (section === "softwarePolicy") {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".management-control-wrapper .setting-btn, .settings-view-host .setting-btn"));
    return buttons.find((button) => button.textContent?.toLowerCase().includes("software")) || null;
  }

  return null;
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
      findManagementSectionButton(managementSection)?.click();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [view, managementSection]);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : next === "management" ? getManagementHash(managementSection) : "";
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
