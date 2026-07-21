import {
  BarChart3,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  NotebookText,
  Settings,
  Timer,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { getDayMarkPath, type DayMarkRoute } from "../../../../app/router/routes";
import { ThemeToggle } from "../../../../components/ThemeToggle";
import type { ThemeMode } from "../../../../hooks/useThemeMode";
import { MiniPomodoroTimer } from "./MiniPomodoroTimer";

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

type NavIcon = LucideIcon;

const primaryNavItems: Array<{
  icon: NavIcon;
  label: string;
  route: DayMarkRoute;
}> = [
  { icon: Home, label: "Hôm nay", route: "today" },
  { icon: CalendarDays, label: "Lịch", route: "calendar" },
  { icon: Timer, label: "Pomodoro", route: "pomodoro" },
  { icon: BarChart3, label: "Thống kê", route: "statistics" },
];

const moreRoutes = new Set<DayMarkRoute>(["notes", "settings"]);

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
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = moreRoutes.has(currentRoute);

  function navigate(route: DayMarkRoute) {
    setMoreOpen(false);
    onNavigate(getDayMarkPath(route));
  }

  return (
    <div className="daymark-shell">
      <div className="daymark-layout">
        <aside className="daymark-sidebar">
          <DayMarkBrand email={email} />

          <nav className="mt-8 grid gap-2" aria-label="DayMark">
            {primaryNavItems.map((item) => (
              <DayMarkNavButton
                key={item.route}
                active={currentRoute === item.route}
                icon={item.icon}
                label={item.label}
                onClick={() => navigate(item.route)}
              />
            ))}
          </nav>

          <div className="mt-auto grid gap-2 pt-8">
            <MiniPomodoroTimer onOpen={() => navigate("pomodoro")} />
            <MoreMenu
              onLogout={onLogout}
              onNavigate={navigate}
              onSwitchApp={onSwitchApp}
              themeMode={themeMode}
              toggleThemeMode={toggleThemeMode}
            />
          </div>
        </aside>

        <div className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <header className="daymark-mobile-header">
            <DayMarkBrand compact email={email} />
            <ThemeToggle
              themeMode={themeMode}
              toggleThemeMode={toggleThemeMode}
            />
          </header>

          <main className="daymark-main">{children}</main>
        </div>
      </div>

      <nav className="daymark-bottom-nav" aria-label="DayMark mobile">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {primaryNavItems.map((item) => (
            <DayMarkBottomButton
              key={item.route}
              active={currentRoute === item.route}
              icon={item.icon}
              label={item.label}
              onClick={() => navigate(item.route)}
            />
          ))}
          <DayMarkBottomButton
            active={isMoreActive || moreOpen}
            icon={Menu}
            label="Thêm"
            onClick={() => setMoreOpen((value) => !value)}
          />
        </div>
      </nav>

      {moreOpen && (
        <div className="daymark-more-sheet" role="dialog" aria-label="Menu thêm">
          <div className="daymark-more-panel">
            <MoreMenu
              onLogout={onLogout}
              onNavigate={navigate}
              onSwitchApp={onSwitchApp}
              themeMode={themeMode}
              toggleThemeMode={toggleThemeMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MoreMenu({
  onLogout,
  onNavigate,
  onSwitchApp,
  themeMode,
  toggleThemeMode,
}: {
  onLogout: () => void;
  onNavigate: (route: DayMarkRoute) => void;
  onSwitchApp: () => void;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
}) {
  return (
    <div className="daymark-more-menu">
      <ThemeToggle
        className="justify-start"
        themeMode={themeMode}
        toggleThemeMode={toggleThemeMode}
      />
      <button type="button" onClick={() => onNavigate("notes")} className="daymark-more-item">
        <NotebookText aria-hidden="true" size={18} />
        Ghi chú
      </button>
      <button type="button" onClick={() => onNavigate("settings")} className="daymark-more-item">
        <Settings aria-hidden="true" size={18} />
        Cài đặt
      </button>
      <button type="button" onClick={onSwitchApp} className="daymark-more-item">
        <Wand2 aria-hidden="true" size={18} />
        Đổi chức năng
      </button>
      <button type="button" onClick={onLogout} className="daymark-more-item text-red-600">
        <LogOut aria-hidden="true" size={18} />
        Đăng xuất
      </button>
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
      <p className="text-sm font-bold tracking-[0.22em] text-[var(--dm-primary)]">
        DayMark
      </p>
      {!compact && (
        <p className="mt-2 text-sm leading-6 text-[var(--dm-muted)]">
          Một lịch ngày nhẹ nhàng cho việc tiếp theo.
        </p>
      )}
      <p className="mt-1 truncate text-xs text-[var(--dm-muted)]">{email}</p>
    </div>
  );
}

function DayMarkNavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: NavIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`daymark-nav-button ${active ? "is-active" : ""}`}
    >
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
    </button>
  );
}

function DayMarkBottomButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: NavIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`daymark-bottom-button ${active ? "is-active" : ""}`}
    >
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
    </button>
  );
}
