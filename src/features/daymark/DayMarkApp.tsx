import type { DayMarkRoute } from "../../app/router/routes";
import type { ThemeMode } from "../../hooks/useThemeMode";
import { DayMarkLayout } from "./components/layout/DayMarkLayout";
import { CalendarPage } from "./pages/CalendarPage";
import { DayMarkSettingsPage } from "./pages/DayMarkSettingsPage";
import { NotesPage } from "./pages/NotesPage";
import { PomodoroPage } from "./pages/PomodoroPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TodayPage } from "./pages/TodayPage";
import { useDayMarkNotificationScheduler } from "../notifications/useNotificationScheduler";

type DayMarkAppProps = {
  currentRoute: DayMarkRoute;
  email?: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onSwitchApp: () => void;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
  userId?: string;
};

export function DayMarkApp({
  currentRoute,
  email,
  onLogout,
  onNavigate,
  onSwitchApp,
  themeMode,
  toggleThemeMode,
  userId,
}: DayMarkAppProps) {
  useDayMarkNotificationScheduler(userId);

  return (
    <DayMarkLayout
      currentRoute={currentRoute}
      email={email}
      onLogout={onLogout}
      onNavigate={onNavigate}
      onSwitchApp={onSwitchApp}
      themeMode={themeMode}
      toggleThemeMode={toggleThemeMode}
    >
      {currentRoute === "today" && (
        <TodayPage onNavigate={onNavigate} userId={userId} />
      )}
      {currentRoute === "calendar" && (
        <CalendarPage onNavigate={onNavigate} userId={userId} />
      )}
      {currentRoute === "statistics" && <StatisticsPage userId={userId} />}
      {currentRoute === "notes" && <NotesPage userId={userId} />}
      {currentRoute === "settings" && (
        <DayMarkSettingsPage userId={userId} />
      )}
      {currentRoute === "pomodoro" && (
        <PomodoroPage onNavigate={onNavigate} userId={userId} />
      )}
    </DayMarkLayout>
  );
}
