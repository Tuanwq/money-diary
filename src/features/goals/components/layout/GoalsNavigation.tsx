import {
  ChartNoAxesCombined,
  CircleCheck,
  Flag,
  LayoutDashboard,
  Target,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { GoalScreen, Page } from "../../../../types";

type GoalsNavigationProps = {
  activeScreen: GoalScreen;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
};

const items: Array<{
  icon: typeof Target;
  label: string;
  screen: GoalScreen;
}> = [
  { icon: LayoutDashboard, label: "Tổng quan", screen: "menu" },
  { icon: Target, label: "Hiện tại", screen: "current" },
  { icon: WalletCards, label: "Mục tiêu phụ", screen: "subGoals" },
  { icon: ChartNoAxesCombined, label: "Biến động", screen: "balance" },
  { icon: CircleCheck, label: "Đã hoàn thành", screen: "completed" },
  { icon: Flag, label: "Mốc kiểm tra", screen: "milestones" },
];

function getNavigationScreen(screen: GoalScreen): GoalScreen {
  return screen === "completedDetail" ? "completed" : screen;
}

export function GoalsNavigation({
  activeScreen,
  navigateTo,
}: GoalsNavigationProps) {
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigationScreen = getNavigationScreen(activeScreen);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [navigationScreen]);

  return (
    <nav className="goals-secondary-navigation" aria-label="Điều hướng mục tiêu">
      <div className="goals-secondary-navigation__track" role="tablist">
        {items.map(({ icon: Icon, label, screen }) => {
          const isActive = navigationScreen === screen;

          return (
            <button
              key={screen}
              ref={isActive ? activeButtonRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`goals-secondary-navigation__item${
                isActive ? " is-active" : ""
              }`}
              onClick={() => navigateTo("goals", screen)}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
