import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  isDark: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "ema-theme";
const GLOBAL_THEME_STYLE_ID = "ema-global-theme-runtime";

const globalThemeCss = `
html.ema-dark {
  color-scheme: dark !important;
}

html.ema-dark body:not(.md-dashboard-page-active),
html.ema-dark body:not(.md-dashboard-page-active) #root {
  background: #020617 !important;
  color: #e2e8f0 !important;
  color-scheme: dark !important;
}

html.ema-dark body:not(.md-dashboard-page-active) {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, .16), transparent 34rem),
    linear-gradient(180deg, #020617 0%, #07111f 100%) !important;
}

html.ema-dark body:not(.md-dashboard-page-active) main,
html.ema-dark body:not(.md-dashboard-page-active) section,
html.ema-dark body:not(.md-dashboard-page-active) .app-shell,
html.ema-dark body:not(.md-dashboard-page-active) .page-shell,
html.ema-dark body:not(.md-dashboard-page-active) .content-shell,
html.ema-dark body:not(.md-dashboard-page-active) .settings-content,
html.ema-dark body:not(.md-dashboard-page-active) .ema-module-root,
html.ema-dark body:not(.md-dashboard-page-active) .ema-page,
html.ema-dark body:not(.md-dashboard-page-active) .ema-page-root,
html.ema-dark body:not(.md-dashboard-page-active) .ema-content,
html.ema-dark body:not(.md-dashboard-page-active) .ema-main,
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-white"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-slate-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-gray-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-zinc-50"] {
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-white/"] {
  background-color: rgba(15, 23, 42, .94) !important;
}

html.ema-dark body:not(.md-dashboard-page-active) .card,
html.ema-dark body:not(.md-dashboard-page-active) .modal-content,
html.ema-dark body:not(.md-dashboard-page-active) .dropdown-menu,
html.ema-dark body:not(.md-dashboard-page-active) .table,
html.ema-dark body:not(.md-dashboard-page-active) .ema-card,
html.ema-dark body:not(.md-dashboard-page-active) .ema-panel,
html.ema-dark body:not(.md-dashboard-page-active) .ema-toolbar,
html.ema-dark body:not(.md-dashboard-page-active) .ema-table-shell,
html.ema-dark body:not(.md-dashboard-page-active) .ema-sidebar-panel,
html.ema-dark body:not(.md-dashboard-page-active) .ema-kpi-card,
html.ema-dark body:not(.md-dashboard-page-active) .service-desk-card,
html.ema-dark body:not(.md-dashboard-page-active) .service-desk-panel,
html.ema-dark body:not(.md-dashboard-page-active) .service-desk-table,
html.ema-dark body:not(.md-dashboard-page-active) .settings-card,
html.ema-dark body:not(.md-dashboard-page-active) .settings-panel,
html.ema-dark body:not(.md-dashboard-page-active) .report-card,
html.ema-dark body:not(.md-dashboard-page-active) .dashboard-card,
html.ema-dark body:not(.md-dashboard-page-active) [class*="shadow"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="rounded"]:not(.sidebar):not(.side-nav):not(.settings-toast):not(.ema-toast) {
  border-color: #1e293b !important;
}

html.ema-dark body:not(.md-dashboard-page-active) [class*="border-slate-200"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="border-slate-100"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="border-gray-200"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="border-gray-100"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="border-zinc-200"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="border-blue-100"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="border-blue-200"] {
  border-color: #1e293b !important;
}

html.ema-dark body:not(.md-dashboard-page-active) [class*="text-slate-900"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-slate-800"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-gray-900"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-gray-800"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-zinc-900"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-zinc-800"],
html.ema-dark body:not(.md-dashboard-page-active) h1,
html.ema-dark body:not(.md-dashboard-page-active) h2,
html.ema-dark body:not(.md-dashboard-page-active) h3,
html.ema-dark body:not(.md-dashboard-page-active) h4,
html.ema-dark body:not(.md-dashboard-page-active) h5,
html.ema-dark body:not(.md-dashboard-page-active) h6,
html.ema-dark body:not(.md-dashboard-page-active) strong {
  color: #f8fafc !important;
}

html.ema-dark body:not(.md-dashboard-page-active) [class*="text-slate-700"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-slate-600"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-gray-700"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-gray-600"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-zinc-700"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-zinc-600"],
html.ema-dark body:not(.md-dashboard-page-active) p,
html.ema-dark body:not(.md-dashboard-page-active) span,
html.ema-dark body:not(.md-dashboard-page-active) small,
html.ema-dark body:not(.md-dashboard-page-active) label,
html.ema-dark body:not(.md-dashboard-page-active) th,
html.ema-dark body:not(.md-dashboard-page-active) td {
  color: #cbd5e1 !important;
}

html.ema-dark body:not(.md-dashboard-page-active) [class*="text-slate-500"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-slate-400"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-gray-500"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="text-gray-400"] {
  color: #94a3b8 !important;
}

html.ema-dark body:not(.md-dashboard-page-active) input,
html.ema-dark body:not(.md-dashboard-page-active) textarea,
html.ema-dark body:not(.md-dashboard-page-active) select,
html.ema-dark body:not(.md-dashboard-page-active) .form-control,
html.ema-dark body:not(.md-dashboard-page-active) .form-select,
html.ema-dark body:not(.md-dashboard-page-active) .uam-filter-trigger,
html.ema-dark body:not(.md-dashboard-page-active) .setting-select-trigger,
html.ema-dark body:not(.md-dashboard-page-active) .ema-input,
html.ema-dark body:not(.md-dashboard-page-active) .ema-select {
  background: #020617 !important;
  border-color: #334155 !important;
  color: #e2e8f0 !important;
  box-shadow: none !important;
}

html.ema-dark body:not(.md-dashboard-page-active) input::placeholder,
html.ema-dark body:not(.md-dashboard-page-active) textarea::placeholder {
  color: #64748b !important;
}

html.ema-dark body:not(.md-dashboard-page-active) button:not(.sidebar button):not(.side-nav button):not([class*="bg-slate-900"]):not([class*="bg-blue"]):not([class*="bg-red"]):not([class*="bg-green"]),
html.ema-dark body:not(.md-dashboard-page-active) .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.danger-btn):not(.primary-btn) {
  border-color: #334155 !important;
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

html.ema-dark body:not(.md-dashboard-page-active) table,
html.ema-dark body:not(.md-dashboard-page-active) thead,
html.ema-dark body:not(.md-dashboard-page-active) tbody,
html.ema-dark body:not(.md-dashboard-page-active) tr,
html.ema-dark body:not(.md-dashboard-page-active) .table-responsive,
html.ema-dark body:not(.md-dashboard-page-active) .ema-table,
html.ema-dark body:not(.md-dashboard-page-active) .ema-table table,
html.ema-dark body:not(.md-dashboard-page-active) .service-desk-table,
html.ema-dark body:not(.md-dashboard-page-active) .uam-table {
  background: #0f172a !important;
  color: #e2e8f0 !important;
  border-color: #1e293b !important;
}

html.ema-dark body:not(.md-dashboard-page-active) thead,
html.ema-dark body:not(.md-dashboard-page-active) th,
html.ema-dark body:not(.md-dashboard-page-active) .table-header,
html.ema-dark body:not(.md-dashboard-page-active) .ema-table-header {
  background: #111c2e !important;
  color: #cbd5e1 !important;
  border-color: #1e293b !important;
}

html.ema-dark body:not(.md-dashboard-page-active) tr,
html.ema-dark body:not(.md-dashboard-page-active) td {
  border-color: #1e293b !important;
}

html.ema-dark body:not(.md-dashboard-page-active) tr:hover,
html.ema-dark body:not(.md-dashboard-page-active) .hover\\:bg-slate-50:hover,
html.ema-dark body:not(.md-dashboard-page-active) .hover\\:bg-gray-50:hover {
  background: #162033 !important;
}

html.ema-dark body:not(.md-dashboard-page-active) .uam-filter-menu,
html.ema-dark body:not(.md-dashboard-page-active) .setting-select-menu,
html.ema-dark body:not(.md-dashboard-page-active) .dropdown-menu,
html.ema-dark body:not(.md-dashboard-page-active) .service-desk-asset-dropdown,
html.ema-dark body:not(.md-dashboard-page-active) .ema-modal,
html.ema-dark body:not(.md-dashboard-page-active) .ema-detail-form-modal,
html.ema-dark body:not(.md-dashboard-page-active) .ema-detail-drawer,
html.ema-dark body:not(.md-dashboard-page-active) .settings-confirm-modal {
  background: #0f172a !important;
  border-color: #334155 !important;
  color: #e2e8f0 !important;
  box-shadow: 0 28px 80px rgba(0, 0, 0, .45) !important;
}

html.ema-dark body:not(.md-dashboard-page-active) .uam-filter-option,
html.ema-dark body:not(.md-dashboard-page-active) .setting-select-menu button,
html.ema-dark body:not(.md-dashboard-page-active) .dropdown-item {
  color: #e2e8f0 !important;
}

html.ema-dark body:not(.md-dashboard-page-active) .uam-filter-option:hover,
html.ema-dark body:not(.md-dashboard-page-active) .uam-filter-option.selected,
html.ema-dark body:not(.md-dashboard-page-active) .setting-select-menu button:hover,
html.ema-dark body:not(.md-dashboard-page-active) .dropdown-item:hover {
  background: #1e293b !important;
  color: #f8fafc !important;
}

html.ema-dark body:not(.md-dashboard-page-active) .settings-toast,
html.ema-dark body:not(.md-dashboard-page-active) .ema-toast {
  color: #0f172a !important;
}

html.ema-dark body:not(.md-dashboard-page-active) .badge,
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-blue-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-green-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-red-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-amber-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-indigo-50"],
html.ema-dark body:not(.md-dashboard-page-active) [class*="bg-emerald-50"] {
  background-color: rgba(30, 41, 59, .92) !important;
}

html.ema-dark body:not(.md-dashboard-page-active) ::-webkit-scrollbar-thumb {
  background: #334155 !important;
}

html.ema-dark body.md-dashboard-page-active,
html.ema-dark body.md-dashboard-page-active #root {
  color-scheme: light !important;
}

html.ema-light,
html.ema-light body,
html.ema-light #root {
  color-scheme: light !important;
}
`;

function getInitialTheme() {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;

  return false;
}

function ensureGlobalThemeStyles() {
  if (typeof document === "undefined") return;

  if (document.getElementById(GLOBAL_THEME_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = GLOBAL_THEME_STYLE_ID;
  style.textContent = globalThemeCss;
  document.head.appendChild(style);
}

function applyTheme(isDark: boolean) {
  if (typeof document === "undefined") return;

  ensureGlobalThemeStyles();

  const theme = isDark ? "dark" : "light";
  const root = document.documentElement;
  const body = document.body;

  root.classList.toggle("dark", isDark);
  root.classList.toggle("ema-dark", isDark);
  root.classList.toggle("ema-light", !isDark);
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;

  body?.classList.toggle("dark", isDark);
  body?.classList.toggle("ema-dark", isDark);
  body?.classList.toggle("ema-light", !isDark);
  body?.setAttribute("data-theme", theme);
  if (body) body.style.colorScheme = theme;

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent("ema-theme-change", { detail: { theme, isDark } }));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      theme: isDark ? "dark" as const : "light" as const,
      toggleTheme: () => setIsDark((current) => !current),
      setTheme: (theme: "light" | "dark") => setIsDark(theme === "dark"),
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
