import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";

function LandingPlaceholder() {
  return (
    <div>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h1 className="app-page-title">Dashboard</h1>
          <p className="app-page-subtitle">
            Your new Bootstrap-based EMA workspace starts here.
          </p>
        </div>

        <button className="btn btn-primary">Create Report</button>
      </div>

      <div className="row g-3">
        {[
          ["Total Hardware", "248"],
          ["Active Users", "86"],
          ["Available Assets", "42"],
          ["Pending Action", "12"],
        ].map(([label, value]) => (
          <div className="col-12 col-md-6 col-xl-3" key={label}>
            <div className="card app-card border-0">
              <div className="card-body">
                <div className="text-muted small mb-2">{label}</div>
                <div className="fs-3 fw-bold">{value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HardwarePlaceholder() {
  return (
    <div>
      <h1 className="app-page-title">Hardware Inventory</h1>
      <p className="app-page-subtitle">
        Next step: kita rebuild page ni sepenuhnya pakai Bootstrap table, card,
        form dan global CSS.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<MainLayout />}>
              <Route path="/landing" element={<LandingPlaceholder />} />
              <Route path="/ema/hardware" element={<HardwarePlaceholder />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}