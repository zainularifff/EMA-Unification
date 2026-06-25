import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { installDisplayCopyStandardizer } from "../../utils/displayCopy";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import "./app-shell-scroll-fix.css";

export function AppShell() {
  useEffect(() => installDisplayCopyStandardizer(), []);

  return (
    <div className="ema-app-shell-root flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="ema-app-shell-sidebar h-screen flex-shrink-0 overflow-hidden">
        <Sidebar />
      </div>

      <div className="ema-app-shell-content flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar />

        <main className="ema-app-shell-main min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
