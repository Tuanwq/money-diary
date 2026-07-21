import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

const STORAGE_THEME_MODE_KEY = "money-diary-theme-mode";

function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_THEME_MODE_KEY);

  return saved === "dark" || saved === "light" || saved === "system"
    ? saved
    : "light";
}

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  useEffect(() => {
    function applyTheme() {
      const isDark = themeMode === "system" ? getSystemPrefersDark() : themeMode === "dark";

      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }

    applyTheme();
    localStorage.setItem(STORAGE_THEME_MODE_KEY, themeMode);

    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyTheme);

    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themeMode]);

  function toggleThemeMode() {
    setThemeMode((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "system";
      return "light";
    });
  }

  return {
    isDarkMode: themeMode === "system" ? getSystemPrefersDark() : themeMode === "dark",
    setThemeMode,
    themeMode,
    toggleThemeMode,
  };
}
