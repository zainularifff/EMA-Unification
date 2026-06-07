import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import HardwareInventory from "./pages/hardware/HardwareInventory";
import Settings from "./pages/Settings/Settings";
import ServiceDesk from "./pages/service-desk/ServiceDesk";
import TaskList from "./pages/tasklist/TaskList";


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
        <Route path="/hardware" element={<HardwareInventory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/service-desk" element={<ServiceDesk />} />
        <Route path="/tasklist" element={<TaskList />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}