import type { GoalScreen, Page } from "../types";

type BottomNavProps = {
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  openCloseDay: () => void;
};

export function BottomNav({ navigateTo, openCloseDay }: BottomNavProps) {
  const items = [
    {
      icon: "🎯",
      label: "Mục tiêu",
      onClick: () => navigateTo("goals", "menu"),
    },
    {
      icon: "✅",
      label: "Chốt ngày",
      onClick: openCloseDay,
    },
    {
      icon: "📝",
      label: "Nhật kí",
      onClick: () => navigateTo("entry"),
    },
    {
      icon: "📚",
      label: "Lịch sử",
      onClick: () => navigateTo("history"),
    },
    {
      icon: "💸",
      label: "Chi tiêu",
      onClick: () => navigateTo("expenses"),
    },
    {
      icon: "🧾",
      label: "Kiểm kê",
      onClick: () => navigateTo("balanceChecks"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-6 px-2 py-2">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="flex flex-col items-center justify-center rounded-xl px-1 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="mt-1 truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}