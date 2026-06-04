import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { TopNavbar } from "../components/layout/TopNavbar";

export default function MainLayout() {
  return (
    <div className="app-shell d-flex">
      <Sidebar />

      <div className="app-main">
        <TopNavbar />

        <main className="app-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}