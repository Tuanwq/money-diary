import {
  CircleEllipsis,
  Goal,
  History,
  House,
  Plus,
} from "lucide-react";
import type { RefObject } from "react";
import type { GoalScreen, Page } from "../../../../types";

type MoneyMobileNavigationProps = {
  addButtonRef: RefObject<HTMLButtonElement | null>;
  currentPage: Page;
  moreButtonRef: RefObject<HTMLButtonElement | null>;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
  onOpenAdd: () => void;
  onOpenMore: () => void;
};

export function MoneyMobileNavigation({
  addButtonRef,
  currentPage,
  moreButtonRef,
  navigateTo,
  onOpenAdd,
  onOpenMore,
}: MoneyMobileNavigationProps) {
  const items = [
    {
      active: currentPage === "home",
      icon: House,
      label: "Tổng quan",
      onClick: () => navigateTo("home"),
    },
    {
      active: currentPage === "goals",
      icon: Goal,
      label: "Mục tiêu",
      onClick: () => navigateTo("goals", "menu"),
    },
    {
      active: false,
      icon: Plus,
      label: "Ghi",
      onClick: onOpenAdd,
      primary: true,
    },
    {
      active: ["balanceChecks", "expenses", "history"].includes(currentPage),
      icon: History,
      label: "Lịch sử",
      onClick: () => navigateTo("history"),
    },
    {
      active: currentPage === "changes",
      icon: CircleEllipsis,
      label: "Thêm",
      onClick: onOpenMore,
    },
  ];

  return (
    <nav className="money-mobile-navigation" aria-label="Điều hướng Money Diary">
      <div className="money-mobile-navigation-inner">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isAddButton = Boolean(item.primary);
          const isMoreButton = index === items.length - 1;

          return (
            <button
              key={`${item.label}-${index}`}
              ref={isAddButton ? addButtonRef : isMoreButton ? moreButtonRef : undefined}
              type="button"
              className={`money-mobile-nav-item ${
                item.active ? "is-active" : ""
              } ${isAddButton ? "is-primary" : ""}`}
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
              aria-label={isAddButton ? "Thêm dữ liệu" : item.label}
            >
              <span className="money-mobile-nav-icon" aria-hidden="true">
                <Icon size={isAddButton ? 24 : 21} strokeWidth={2.1} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
