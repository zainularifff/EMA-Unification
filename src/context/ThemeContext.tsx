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
html.ema-dark,
html.ema-dark body,
html.ema-dark #root {
  background: #020617 !important;
  color: #e2e8f0 !important;
  color-scheme: dark !important;
}

html.ema-dark body {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, .16), transparent 34rem),
    linear-gradient(180deg, #020617 0%, #07111f 100%) !important;
}

html.ema-dark main,
html.ema-dark section,
html.ema-dark .app-shell,
html.ema-dark .page-shell,
html.ema-dark .content-shell,
html.ema-dark .settings-content,
html.ema-dark .ema-module-root,
html.ema-dark .ema-page,
html.ema-dark .ema-page-root,
html.ema-dark .ema-content,
html.ema-dark .ema-main,
html.ema-dark [class*="bg-white"],
html.ema-dark [class*="bg-slate-50"],
html.ema-dark [class*="bg-gray-50"],
html.ema-dark [class*="bg-zinc-50"] {
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

html.ema-dark [class*="bg-white/"] {
  background-color: rgba(15, 23, 42, .94) !important;
}

html.ema-dark .card,
html.ema-dark .modal-content,
html.ema-dark .dropdown-menu,
html.ema-dark .table,
html.ema-dark .ema-card,
html.ema-dark .ema-panel,
html.ema-dark .ema-toolbar,
html.ema-dark .ema-table-shell,
html.ema-dark .ema-sidebar-panel,
html.ema-dark .ema-kpi-card,
html.ema-dark .service-desk-card,
html.ema-dark .service-desk-panel,
html.ema-dark .service-desk-table,
html.ema-dark .settings-card,
html.ema-dark .settings-panel,
html.ema-dark .report-card,
html.ema-dark .dashboard-card,
html.ema-dark [class*="shadow"],
html.ema-dark [class*="rounded"]:not(.sidebar):not(.side-nav):not(.settings-toast):not(.ema-toast) {
  border-color: #1e293b !important;
}

html.ema-dark [class*="border-slate-200"],
html.ema-dark [class*="border-slate-100"],
html.ema-dark [class*="border-gray-200"],
html.ema-dark [class*="border-gray-100"],
html.ema-dark [class*="border-zinc-200"],
html.ema-dark [class*="border-blue-100"],
html.ema-dark [class*="border-blue-200"] {
  border-color: #1e293b !important;
}

html.ema-dark [class*="text-slate-900"],
html.ema-dark [class*="text-slate-800"],
html.ema-dark [class*="text-gray-900"],
html.ema-dark [class*="text-gray-800"],
html.ema-dark [class*="text-zinc-900"],
html.ema-dark [class*="text-zinc-800"],
html.ema-dark h1,
html.ema-dark h2,
html.ema-dark h3,
html.ema-dark h4,
html.ema-dark h5,
html.ema-dark h6,
html.ema-dark strong {
  color: #f8fafc !important;
}

html.ema-dark [class*="text-slate-700"],
html.ema-dark [class*="text-slate-600"],
html.ema-dark [class*="text-gray-700"],
html.ema-dark [class*="text-gray-600"],
html.ema-dark [class*="text-zinc-700"],
html.ema-dark [class*="text-zinc-600"],
html.ema-dark p,
html.ema-dark span,
html.ema-dark small,
html.ema-dark label,
html.ema-dark th,
html.ema-dark td {
  color: #cbd5e1 !important;
}

html.ema-dark [class*="text-slate-500"],
html.ema-dark [class*="text-slate-400"],
html.ema-dark [class*="text-gray-500"],
html.ema-dark [class*="text-gray-400"] {
  color: #94a3b8 !important;
}

html.ema-dark input,
html.ema-dark textarea,
html.ema-dark select,
html.ema-dark .form-control,
html.ema-dark .form-select,
html.ema-dark .uam-filter-trigger,
html.ema-dark .setting-select-trigger,
html.ema-dark .ema-input,
html.ema-dark .ema-select {
  background: #020617 !important;
  border-color: #334155 !important;
  color: #e2e8f0 !important;
  box-shadow: none !important;
}

html.ema-dark input::placeholder,
html.ema-dark textarea::placeholder {
  color: #64748b !important;
}

html.ema-dark button:not(.sidebar button):not(.side-nav button):not([class*="bg-slate-900"]):not([class*="bg-blue"]):not([class*="bg-red"]):not([class*="bg-green"]),
html.ema-dark .btn:not(.btn-primary):not(.btn-danger):not(.btn-success):not(.danger-btn):not(.primary-btn) {
  border-color: #334155 !important;
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

html.ema-dark table,
html.ema-dark thead,
html.ema-dark tbody,
html.ema-dark tr,
html.ema-dark .table-responsive,
html.ema-dark .ema-table,
html.ema-dark .ema-table table,
html.ema-dark .service-desk-table,
html.ema-dark .uam-table {
  background: #0f172a !important;
  color: #e2e8f0 !important;
  border-color: #1e293b !important;
}

html.ema-dark thead,
html.ema-dark th,
html.ema-dark .table-header,
html.ema-dark .ema-table-header {
  background: #111c2e !important;
  color: #cbd5e1 !important;
  border-color: #1e293b !important;
}

html.ema-dark tr,
html.ema-dark td {
  border-color: #1e293b !important;
}

html.ema-dark tr:hover,
html.ema-dark .hover\\:bg-slate-50:hover,
html.ema-dark .hover\\:bg-gray-50:hover {
  background: #162033 !important;
}

html.ema-dark .uam-filter-menu,
html.ema-dark .setting-select-menu,
html.ema-dark .dropdown-menu,
html.ema-dark .service-desk-asset-dropdown,
html.ema-dark .ema-modal,
html.ema-dark .ema-detail-form-modal,
html.ema-dark .ema-detail-drawer,
html.ema-dark .settings-confirm-modal {
  background: #0f172a !important;
  border-color: #334155 !important;
  color: #e2e8f0 !important;
  box-shadow: 0 28px 80px rgba(0, 0, 0, .45) !important;
}

html.ema-dark .uam-filter-option,
html.ema-dark .setting-select-menu button,
html.ema-dark .dropdown-item {
  color: #e2e8f0 !important;
}

html.ema-dark .uam-filter-option:hover,
html.ema-dark .uam-filter-option.selected,
html.ema-dark .setting-select-menu button:hover,
html.ema-dark .dropdown-item:hover {
  background: #1e293b !important;
  color: #f8fafc !important;
}

html.ema-dark .settings-toast,
html.ema-dark .ema-toast {
  color: #0f172a !important;
}

html.ema-dark .badge,
html.ema-dark [class*="bg-blue-50"],
html.ema-dark [class*="bg-green-50"],
html.ema-dark [class*="bg-red-50"],
html.ema-dark [class*="bg-amber-50"],
html.ema-dark [class*="bg-indigo-50"],
html.ema-dark [class*="bg-emerald-50"] {
  background-color: rgba(30, 41, 59, .92) !important;
}

html.ema-dark ::-webkit-scrollbar-thumb {
  background: #334155 !important;
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
