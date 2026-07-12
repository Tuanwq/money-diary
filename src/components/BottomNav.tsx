import type { GoalScreen, Page } from "../types";

type BottomNavProps = {
  currentPage: Page;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  openCloseDay: () => void;
};

export function BottomNav({
  currentPage,
  navigateTo,
  openCloseDay,
}: BottomNavProps) {
  const items = [
    {
      icon: "🎯",
      label: "Mục tiêu",
      active: currentPage === "goals",
      onClick: () => navigateTo("goals", "menu"),
    },
    {
      icon: "✅",
      label: "Chốt ngày",
      active: currentPage === "closeDay",
      onClick: openCloseDay,
    },
    {
      icon: "🚚",
      label: "Hub",
      active: currentPage === "hub",
      onClick: () => navigateTo("hub"),
    },
    // {
    //   icon: "📝",
    //   label: "Nhật kí",
    //   onClick: () => navigateTo("entry"),
    // },
    {
      icon: "📚",
      label: "Lịch sử",
      active: currentPage === "history",
      onClick: () => navigateTo("history"),
    },
    {
      icon: "💸",
      label: "Chi tiêu",
      active: currentPage === "expenses",
      onClick: () => navigateTo("expenses"),
    },
    {
      icon: "🧾",
      label: "Kiểm kê",
      active: currentPage === "balanceChecks",
      onClick: () => navigateTo("balanceChecks"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-[var(--bottom-nav-offset)] z-50 border-t border-emerald-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(4,120,87,0.12)] backdrop-blur lg:inset-x-auto lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:rounded-3xl lg:border lg:bg-white/90 lg:px-2 lg:pb-0">
      <div className="mx-auto grid max-w-6xl grid-cols-6 gap-1 px-2 py-2 lg:flex lg:w-max lg:max-w-none lg:grid-cols-none lg:px-0">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            aria-current={item.active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[11px] font-bold leading-tight transition active:scale-[0.98] sm:text-xs lg:min-h-11 lg:flex-row lg:gap-2 lg:px-4 lg:text-sm ${
              item.active
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-emerald-50"
            }`}
          >
            <span className="text-lg leading-none sm:text-xl lg:text-base">
              {item.icon}
            </span>
            <span className="mt-1 max-w-full truncate lg:mt-0">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
