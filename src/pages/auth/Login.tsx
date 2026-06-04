import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Monitor,
  ShieldCheck,
  Sun,
  Moon,
  User,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    "http://localhost:3001").replace(/\/$/, "");

type LoginApiUser = {
  console_Idn?: number;
  Console_Idn?: number;
  userID?: string;
  UserID?: string;
  menuIndex?: number;
  MenuIndex?: number;
};

type LoginApiResponse = {
  success?: boolean;
  message?: string;
  accessToken?: string;
  token?: string;
  user?: LoginApiUser;
  data?: {
    token?: string;
    accessToken?: string;
    user?: LoginApiUser;
  };
};

type LoggedInUser = {
  id: number;
  username: string;
  name: string;
  role: string;
  department: string;
  console_Idn: number;
  userID: string;
  menuIndex: number;
};

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function storeAuthToken(accessToken: string, user: LoggedInUser) {
  localStorage.setItem("ema-access-token", accessToken);
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("token", accessToken);
  localStorage.setItem(
    "ema-auth",
    JSON.stringify({
      token: accessToken,
      accessToken,
      user,
    })
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      let payload: LoginApiResponse | null = null;

      try {
        payload = (await response.json()) as LoginApiResponse;
      } catch {
        payload = null;
      }

      if (!response.ok || payload?.success === false) {
        setError(payload?.message || "Invalid username or password.");
        return;
      }

      const accessToken =
        payload?.data?.token ||
        payload?.data?.accessToken ||
        payload?.accessToken ||
        payload?.token ||
        "";

      const apiUser = payload?.data?.user || payload?.user || {};
      const consoleId = toSafeNumber(
        apiUser.console_Idn ?? apiUser.Console_Idn,
        0
      );
      const userId = String(apiUser.userID ?? apiUser.UserID ?? cleanUsername);
      const menuIndex = toSafeNumber(
        apiUser.menuIndex ?? apiUser.MenuIndex,
        0
      );

      if (!accessToken) {
        setError("Login API did not return an access token.");
        return;
      }

      const loggedInUser: LoggedInUser = {
        id: consoleId,
        username: userId,
        name: userId,
        role: "User",
        department: "",
        console_Idn: consoleId,
        userID: userId,
        menuIndex,
      };

      const loginWithToken = authLogin as unknown as (
        token: string,
        user: LoggedInUser
      ) => void;

      loginWithToken(accessToken, loggedInUser);
      storeAuthToken(accessToken, loggedInUser);

      if (rememberMe) {
        localStorage.setItem("ema-remember-username", cleanUsername);
      } else {
        localStorage.removeItem("ema-remember-username");
      }

      navigate("/landing", { replace: true });
    } catch (err) {
      console.error("Login API error:", err);
      setError(
        "Cannot connect to login API. Please check that the API server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`auth-page ${isDark ? "auth-page-dark" : ""}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className="btn btn-light auth-theme-toggle d-flex align-items-center gap-2"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
        {isDark ? "Light" : "Dark"}
      </button>

      <section className="container-fluid">
        <div className="row">
          <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-4 p-lg-5">
            <div className="auth-card card app-card border-0 w-100">
              <div className="card-body p-4">
                <div className="auth-brand mb-4">
                  <div className="auth-logo mx-auto mb-3">
                    <Monitor size={28} />
                  </div>

                  <h1 className="h4 fw-bold mb-1">EMA System</h1>
                  <p className="text-muted mb-0 small">
                    Endpoint Management Advanced
                  </p>
                </div>

                <div className="auth-intro mb-4">
                  <span className="badge text-bg-primary rounded-pill px-3 py-2 mb-3">
                    Secure Workspace
                  </span>

                  <h2 className="display-6 fw-bold mb-2">Welcome back</h2>

                  <p className="text-muted mb-0">
                    Sign in to continue managing endpoint inventory, access and system
                    operations.
                  </p>
                </div>

                {error ? (
                  <div className="alert alert-danger rounded-4" role="alert">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Username</label>

                    <div className="input-group auth-input-group">
                      <span className="input-group-text">
                        <User size={18} />
                      </span>

                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Password</label>

                    <div className="input-group auth-input-group">
                      <span className="input-group-text">
                        <LockKeyhole size={18} />
                      </span>

                      <input
                        type={showPass ? "text" : "password"}
                        className="form-control"
                        placeholder="Enter password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPass((current) => !current)}
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                    <div className="form-check">
                      <input
                        id="rememberMe"
                        type="checkbox"
                        className="form-check-input"
                        checked={rememberMe}
                        onChange={(event) =>
                          setRememberMe(event.target.checked)
                        }
                      />
                      <label htmlFor="rememberMe" className="form-check-label">
                        Remember me
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={19} />
                        Sign in
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-security-note mt-4">
                  <ShieldCheck size={18} />
                  <span>
                    Authorized access only. Your session is protected and
                    monitored for system security.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6 d-none d-lg-flex auth-hero-panel">
            <div className="auth-hero-content">
              <div className="badge text-bg-light rounded-pill px-3 py-2 mb-4">
                Worldtech Operations Console
              </div>

              <h2 className="display-4 fw-bold text-white mb-3">
                One workspace for endpoint visibility.
              </h2>

              <p className="lead text-white-50 mb-5">
                Monitor hardware inventory, device ownership, access control and
                operational activity from a cleaner Bootstrap-based interface.
              </p>

              <div className="row g-3">
                <div className="col-6">
                  <div className="auth-metric-card">
                    <Mail size={22} className="text-white-50 mb-3" />
                    <div className="fs-3 fw-bold text-white">Secure</div>
                    <div className="text-white-50 small">Login Flow</div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="auth-metric-card">
                    <Monitor size={22} className="text-white-50 mb-3" />
                    <div className="fs-3 fw-bold text-white">Unified</div>
                    <div className="text-white-50 small">EMA Console</div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="auth-metric-card">
                    <ShieldCheck size={22} className="text-white-50 mb-3" />
                    <div className="fs-3 fw-bold text-white">Role</div>
                    <div className="text-white-50 small">Based Access</div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="auth-metric-card">
                    <LockKeyhole size={22} className="text-white-50 mb-3" />
                    <div className="fs-3 fw-bold text-white">Protected</div>
                    <div className="text-white-50 small">System Access</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
