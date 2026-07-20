import { ThemeToggle } from "./ThemeToggle";
import type { ThemeMode } from "../hooks/useThemeMode";

type AccountBarProps = {
  email?: string;
  syncStatus: string;
  onExportWord: () => void;
  onOpenChangeLog: () => void;
  onLogout: () => void;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

export function AccountBar({
  email,
  syncStatus,
  onExportWord,
  onOpenChangeLog,
  onLogout,
  themeMode,
  toggleThemeMode,
}: AccountBarProps) {
  return (
    <section className="app-card grid gap-3 rounded-2xl p-3 sm:flex sm:items-center sm:justify-between sm:p-4">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">Tài khoản</p>
        <p className="truncate font-bold">{email}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <span className="col-span-2 rounded-full bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-800 sm:col-span-1 sm:py-1">
          {syncStatus}
        </span>

        <button
          type="button"
          onClick={onExportWord}
          className="app-primary-button rounded-xl px-3 py-2 text-sm font-medium sm:px-4"
        >
          <span className="sm:hidden">Xuất Word</span>
          <span className="hidden sm:inline">Xuất báo cáo Word</span>
        </button>

        <button
          type="button"
          onClick={onOpenChangeLog}
          className="app-secondary-button rounded-xl px-3 py-2 text-sm font-medium sm:px-4"
        >
          <span className="sm:hidden">Lịch sử</span>
          <span className="hidden sm:inline">Lịch sử thay đổi</span>
        </button>

        <ThemeToggle
          className="col-span-2 sm:col-span-1"
          themeMode={themeMode}
          toggleThemeMode={toggleThemeMode}
        />

        <button
          type="button"
          onClick={onLogout}
          className="app-secondary-button col-span-2 rounded-xl px-3 py-2 text-sm font-medium sm:col-span-1 sm:px-4"
        >
          Đăng xuất
        </button>
      </div>
    </section>
  );
}
