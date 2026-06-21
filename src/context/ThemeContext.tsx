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

function getInitialTheme() {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

function applyTheme(isDark: boolean) {
  if (typeof document === "undefined") return;

  const theme = isDark ? "dark" : "light";
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.classList.toggle("ema-dark", isDark);
  root.classList.toggle("ema-light", !isDark);
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
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
