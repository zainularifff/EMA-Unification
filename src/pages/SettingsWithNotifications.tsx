import { useEffect, useState } from "react";
import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";
import "../styles/notification-channels.css";

type SettingsView = "settings" | "notifications";

function readInitialView(): SettingsView {
  if (typeof window === "undefined") return "settings";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const tab = String(query.get("tab") || "").toLowerCase();
  return hash.includes("notification") || tab.includes("notification") ? "notifications" : "settings";
}

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);

  useEffect(() => {
    const onHashChange = () => setView(readInitialView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : "";
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
  };

  return (
    <div className="settings-with-notifications">
      <div className="settings-notification-page-tabs">
        <button className={`notification-tab ${view === "settings" ? "active" : ""}`} onClick={() => switchView("settings")}>Settings Console</button>
        <button className={`notification-tab ${view === "notifications" ? "active" : ""}`} onClick={() => switchView("notifications")}>Notification Channels</button>
      </div>
      {view === "notifications" ? <NotificationChannelsSettings /> : <LegacySettings />}
    </div>
  );
}
