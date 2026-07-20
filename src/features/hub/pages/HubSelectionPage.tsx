import { ThemeToggle } from "../../../components/ThemeToggle";
import type { ThemeMode } from "../../../hooks/useThemeMode";

type HubSelectionPageProps = {
  email?: string;
  onLogout: () => void;
  onOpenDayMark: () => void;
  onOpenMoneyDiary: () => void;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

type HubFeatureCardProps = {
  accentClassName: string;
  description: string;
  icon: string;
  onClick: () => void;
  title: string;
};

export function HubSelectionPage({
  email,
  onLogout,
  onOpenDayMark,
  onOpenMoneyDiary,
  themeMode,
  toggleThemeMode,
}: HubSelectionPageProps) {
  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 py-5 text-[var(--text-primary)] sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Chọn chức năng
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Money Diary Hub
            </h1>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {email}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ThemeToggle
              themeMode={themeMode}
              toggleThemeMode={toggleThemeMode}
            />
            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <HubFeatureCard
            accentClassName="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100"
            description="Theo dõi thu nhập, tiết kiệm và mục tiêu tài chính."
            icon="💰"
            onClick={onOpenMoneyDiary}
            title="Money Diary"
          />

          <HubFeatureCard
            accentClassName="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100"
            description="Lập kế hoạch, theo dõi nhiệm vụ và đánh dấu từng ngày."
            icon="✅"
            onClick={onOpenDayMark}
            title="DayMark"
          />
        </section>
      </div>
    </main>
  );
}

function HubFeatureCard({
  accentClassName,
  description,
  icon,
  onClick,
  title,
}: HubFeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-64 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700 sm:p-6"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${accentClassName}`}
      >
        {icon}
      </span>

      <span className="mt-8 block text-2xl font-black tracking-tight">
        {title}
      </span>
      <span className="mt-3 block max-w-sm text-base leading-7 text-slate-500 dark:text-slate-400">
        {description}
      </span>
      <span className="mt-8 inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-emerald-700 dark:bg-white dark:text-slate-950 dark:group-hover:bg-emerald-100">
        Mở chức năng
      </span>
    </button>
  );
}
