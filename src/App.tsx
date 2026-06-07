import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Hardware from "./pages/hardware/Hardware";
import Settings from "./pages/settings/Settings";
import ServiceDesk from "./pages/service-desk/ServiceDesk";
import TaskList from "./pages/tasklist/TaskList";
import Report from "./pages/report/Report";
import Software from "./pages/software/software";


import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hardware" element={<Hardware />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/service-desk" element={<ServiceDesk />} />
        <Route path="/tasklist" element={<TaskList />} />
        <Route path="/report" element={<Report />} />
        <Route path="/software" element={<Software />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}