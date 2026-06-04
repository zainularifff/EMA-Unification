import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "ema-theme";
const LEGACY_STORAGE_KEYS = ["theme", "color-theme", "vite-ui-theme"];

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of keys) {
    const savedTheme = window.localStorage.getItem(key);
    if (isThemeMode(savedTheme)) return savedTheme;
  }

  return null;
}

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): ThemeMode {
  return readStoredTheme() || getSystemTheme();
}

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const body = document.body;
  const oppositeTheme: ThemeMode = theme === "dark" ? "light" : "dark";

  html.dataset.theme = theme;
  html.dataset.bsTheme = theme;
  html.style.colorScheme = theme;

  html.classList.remove(oppositeTheme, `${oppositeTheme}-theme`, `theme-${oppositeTheme}`);
  html.classList.add(theme, `${theme}-theme`, `theme-${theme}`);

  if (body) {
    body.dataset.theme = theme;
    body.dataset.bsTheme = theme;
    body.style.colorScheme = theme;

    body.classList.remove(oppositeTheme, `${oppositeTheme}-theme`, `theme-${oppositeTheme}`);
    body.classList.add(theme, `${theme}-theme`, `theme-${theme}`);
  }

  window.dispatchEvent(
    new CustomEvent("ema-theme-change", {
      detail: {
        theme,
        isDark: theme === "dark",
      },
    }),
  );
}

function persistTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, theme);

  // Keep older pages/components that read `theme` directly working.
  window.localStorage.setItem("theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    persistTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      persistTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
