import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { installDisplayCopyStandardizer } from "../../utils/displayCopy";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

export function AppShell() {
  useEffect(() => installDisplayCopyStandardizer(), []);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />

        <main className="min-w-0 flex-1 overflow-auto p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
