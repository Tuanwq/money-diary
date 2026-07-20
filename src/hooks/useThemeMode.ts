import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_THEME_MODE_KEY = "money-diary-theme-mode";

function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_THEME_MODE_KEY);

  return saved === "dark" ? "dark" : "light";
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  useEffect(() => {
    const isDark = themeMode === "dark";

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = themeMode;
    localStorage.setItem(STORAGE_THEME_MODE_KEY, themeMode);
  }, [themeMode]);

  function toggleThemeMode() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  }

  return {
    isDarkMode: themeMode === "dark",
    setThemeMode,
    themeMode,
    toggleThemeMode,
  };
}
