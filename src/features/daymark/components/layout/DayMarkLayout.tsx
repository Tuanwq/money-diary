import type { ReactNode } from "react";
import { getDayMarkPath, type DayMarkRoute } from "../../../../app/router/routes";
import { ThemeToggle } from "../../../../components/ThemeToggle";
import type { ThemeMode } from "../../../../hooks/useThemeMode";

type DayMarkLayoutProps = {
  children: ReactNode;
  currentRoute: DayMarkRoute;
  email?: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onSwitchApp: () => void;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

const dayMarkNavItems: Array<{
  icon: string;
  label: string;
  route: DayMarkRoute;
}> = [
  { icon: "☀️", label: "Hôm nay", route: "today" },
  { icon: "📅", label: "Lịch", route: "calendar" },
  { icon: "📊", label: "Thống kê", route: "statistics" },
  { icon: "📝", label: "Ghi chú", route: "notes" },
  { icon: "⚙️", label: "Cài đặt", route: "settings" },
];

export function DayMarkLayout({
  children,
  currentRoute,
  email,
  onLogout,
  onNavigate,
  onSwitchApp,
  themeMode,
  toggleThemeMode,
}: DayMarkLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 hidden h-[100dvh] border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
          <DayMarkBrand email={email} />

          <nav className="mt-6 grid gap-2" aria-label="DayMark">
            {dayMarkNavItems.map((item) => (
              <DayMarkNavButton
                key={item.route}
                active={currentRoute === item.route}
                icon={item.icon}
                label={item.label}
                onClick={() => onNavigate(getDayMarkPath(item.route))}
              />
            ))}
          </nav>

          <div className="mt-6 grid gap-2">
            <ThemeToggle
              className="justify-start"
              themeMode={themeMode}
              toggleThemeMode={toggleThemeMode}
            />
            <button
              type="button"
              onClick={onSwitchApp}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-bold transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Đổi chức năng
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 dark:border-slate-700 dark:hover:bg-red-950/30"
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <DayMarkBrand compact email={email} />
              <button
                type="button"
                onClick={onSwitchApp}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-700"
              >
                Đổi
              </button>
              <ThemeToggle
                themeMode={themeMode}
                toggleThemeMode={toggleThemeMode}
              />
            </div>
          </header>

          <main className="mx-auto grid max-w-5xl gap-4 px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {dayMarkNavItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => onNavigate(getDayMarkPath(item.route))}
              aria-current={currentRoute === item.route ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-bold transition ${
                currentRoute === item.route
                  ? "bg-emerald-700 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function DayMarkBrand({
  compact = false,
  email,
}: {
  compact?: boolean;
  email?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
        DayMark
      </p>
      {!compact && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Theo dõi nhiệm vụ, học tập và sức khỏe mỗi ngày.
        </p>
      )}
      <p className="mt-1 truncate text-xs text-slate-400">{email}</p>
    </div>
  );
}

function DayMarkNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
        active
          ? "bg-emerald-700 text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
