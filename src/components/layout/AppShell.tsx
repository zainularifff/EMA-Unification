import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { installDisplayCopyStandardizer } from "../../utils/displayCopy";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

export function AppShell() {
  useEffect(() => installDisplayCopyStandardizer(), []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="h-screen flex-shrink-0 overflow-hidden">
        <Sidebar />
      </div>

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
