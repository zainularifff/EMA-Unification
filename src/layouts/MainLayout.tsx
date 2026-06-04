import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { TopNavbar } from "../components/layout/TopNavbar";
import { useTheme } from "../context/ThemeContext";

export default function MainLayout() {
  const { isDark } = useTheme();

  return (
    <div className={`app-shell d-flex ${isDark ? "app-shell-dark" : ""}`}>
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
