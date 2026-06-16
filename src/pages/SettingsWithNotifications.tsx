import { useEffect, useState } from "react";
import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import "../styles/notification-channels.css";
import "../styles/management-control-settings.css";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy";

const MANAGEMENT_SECTIONS: { key: ManagementSection; title: string; desc: string }[] = [
  { key: "aging", title: "PC Aging", desc: "Aging PC Rule and lifecycle threshold." },
  { key: "pricing", title: "Device Pricing", desc: "Device replacement and costing values." },
  { key: "policy", title: "Management Policy", desc: "Dashboard policy control values." },
];

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

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);
  const [managementSection, setManagementSection] = useState<ManagementSection>(readManagementSection);

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

  const switchManagementSection = (next: ManagementSection) => {
    setManagementSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#management-control-${next}`);
    }
  };

  return (
    <div className={`settings-with-notifications settings-view-${view}`} data-settings-view={view}>
      <div className="settings-notification-page-tabs">
        <button className={`notification-tab ${view === "settings" ? "active" : ""}`} onClick={() => switchView("settings")}>Settings Console</button>
        <button className={`notification-tab ${view === "management" ? "active" : ""}`} onClick={() => switchView("management")}>Management Control</button>
        <button className={`notification-tab ${view === "notifications" ? "active" : ""}`} onClick={() => switchView("notifications")}>Notification Channels</button>
      </div>

      <div className="settings-view-host">
        {view === "notifications" ? (
          <NotificationChannelsSettings />
        ) : view === "management" ? (
          <div className="management-control-wrapper" data-management-section={managementSection}>
            <div className="management-control-topbar">
              <div>
                <span>MANAGEMENT CONTROL</span>
                <h2>Management Control</h2>
                <p>Centralise PC aging, device pricing and management policy in one admin area.</p>
              </div>
              <div className="management-control-tabs" role="tablist" aria-label="Management Control">
                {MANAGEMENT_SECTIONS.map((item) => (
                  <button
                    key={item.key}
                    className={`management-control-tab ${managementSection === item.key ? "active" : ""}`}
                    type="button"
                    onClick={() => switchManagementSection(item.key)}
                  >
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </button>
                ))}
              </div>
            </div>
            <LegacySettings key={`management-${managementSection}`} />
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
