import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "../hooks/useThemeMode";

type ThemeToggleProps = {
  className?: string;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

export function ThemeToggle({
  className = "",
  themeMode,
  toggleThemeMode,
}: ThemeToggleProps) {
  const isDark = themeMode === "dark";
  const Icon = themeMode === "system" ? Monitor : isDark ? Sun : Moon;
  const label =
    themeMode === "system"
      ? "Theo hệ thống"
      : isDark
        ? "Sáng"
        : "Tối";

  return (
    <button
      type="button"
      onClick={toggleThemeMode}
      aria-pressed={isDark}
      title={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${className}`}
    >
      <Icon aria-hidden="true" size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
