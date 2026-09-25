import {
  BookOpenText,
  Camera,
  CookingPot,
  ChartColumnBig,
  ChartNoAxesCombined,
  ChevronRight,
  Goal,
  History,
  House,
  LogOut,
  PackagePlus,
  RefreshCcw,
  Scale,
  Settings,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RefObject } from "react";
import type { GoalScreen, Page } from "../../../../types";
import { MoneyDiaryLogo } from "./MoneyDiaryLogo";
import { MoneySyncStatus } from "./MoneySyncStatus";

type MoneyDesktopSidebarProps = {
  addButtonRef: RefObject<HTMLButtonElement | null>;
  currentPage: Page;
  email?: string;
  isCloudRefreshing: boolean;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
  accountButtonRef: RefObject<HTMLButtonElement | null>;
  onLogout: () => void;
  onOpenAccount: () => void;
  onOpenAdd: () => void;
  onOpenSettings: () => void;
  onRetrySync: () => void;
  onSwitchApp: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
  syncStatus: string;
};

type SidebarItem = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

export function MoneyDesktopSidebar({
  accountButtonRef,
  addButtonRef,
  currentPage,
  email,
  isCloudRefreshing,
  navigateTo,
  onLogout,
  onOpenAccount,
  onOpenAdd,
  onOpenSettings,
  onRetrySync,
  onSwitchApp,
  settingsButtonRef,
  syncStatus,
}: MoneyDesktopSidebarProps) {
  const navigationItems: SidebarItem[] = [
    {
      active: currentPage === "home",
      icon: House,
      label: "Tổng quan",
      onClick: () => navigateTo("home"),
    },
    {
      active: currentPage === "analytics",
      icon: ChartColumnBig,
      label: "Thống kê",
      onClick: () => navigateTo("analytics"),
    },
    {
      active: currentPage === "photoJournal",
      icon: Camera,
      label: "Nhật ký tài chính",
      onClick: () => navigateTo("photoJournal"),
    },
    {
      active: currentPage === "spendingJars",
      icon: CookingPot,
      label: "Hũ chi tiêu",
      onClick: () => navigateTo("spendingJars"),
    },
    {
      active: currentPage === "goals",
      icon: Goal,
      label: "Mục tiêu",
      onClick: () => navigateTo("goals", "menu"),
    },
    {
      active: currentPage === "closeDay" || currentPage === "entry",
      icon: BookOpenText,
      label: "Ghi chép",
      onClick: () => navigateTo("closeDay"),
    },
    {
      active: currentPage === "hub",
      icon: PackagePlus,
      label: "Ca HUB",
      onClick: () => navigateTo("hub"),
    },
    {
      active: currentPage === "accounts",
      icon: WalletCards,
      label: "Sổ tài khoản",
      onClick: () => navigateTo("accounts"),
    },
    {
      active: currentPage === "reconciliation",
      icon: Scale,
      label: "Kiểm kê tài khoản",
      onClick: () => navigateTo("reconciliation"),
    },
    {
      active: ["balanceChecks", "expenses", "history"].includes(currentPage),
      icon: History,
      label: "Lịch sử",
      onClick: () => navigateTo("history"),
    },
  ];

  return (
    <aside className="money-desktop-sidebar">
      <div className="money-sidebar-brand">
        <MoneyDiaryLogo />
        <div className="money-sidebar-brand-copy">
          <strong>Money Diary</strong>
          <span>Financial calm</span>
        </div>
      </div>

      <button ref={addButtonRef} type="button" className="money-sidebar-add" onClick={onOpenAdd}>
        <PackagePlus aria-hidden="true" size={19} />
        <span>Thêm dữ liệu</span>
      </button>

      <nav className="money-sidebar-navigation" aria-label="Điều hướng chính">
        {navigationItems.map((item) => (
          <SidebarButton key={item.label} item={item} />
        ))}
      </nav>

      <div className="money-sidebar-footer">
        <button
          ref={settingsButtonRef}
          type="button"
          className={`money-sidebar-link ${currentPage === "settings" ? "is-active" : ""}`}
          onClick={onOpenSettings}
          aria-current={currentPage === "settings" ? "page" : undefined}
        >
          <Settings aria-hidden="true" size={19} />
          <span>Cài đặt</span>
        </button>
        <button type="button" className="money-sidebar-link" onClick={onSwitchApp}>
          <RefreshCcw aria-hidden="true" size={19} />
          <span>Đổi chức năng</span>
        </button>
        <button type="button" className="money-sidebar-link" onClick={onLogout}>
          <LogOut aria-hidden="true" size={19} />
          <span>Đăng xuất</span>
        </button>

        <button
          ref={accountButtonRef}
          type="button"
          className="money-sidebar-account"
          title={email ? `Mở tài khoản ${email}` : "Mở tài khoản"}
          aria-label="Mở tài khoản và công cụ"
          onClick={onOpenAccount}
        >
          <span className="money-sidebar-avatar" aria-hidden="true">
            <ChartNoAxesCombined size={18} />
          </span>
          <span className="money-sidebar-account-copy">
            <small>Tài khoản</small>
            <strong>{email ?? "Money Diary"}</strong>
          </span>
          <ChevronRight
            className="money-sidebar-account-chevron"
            aria-hidden="true"
            size={17}
          />
        </button>
        <MoneySyncStatus
          isRefreshing={isCloudRefreshing}
          onRetry={onRetrySync}
          syncStatus={syncStatus}
        />
      </div>
    </aside>
  );
}

function SidebarButton({ item }: { item: SidebarItem }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      className={`money-sidebar-link ${item.active ? "is-active" : ""}`}
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
    >
      <Icon aria-hidden="true" size={19} />
      <span>{item.label}</span>
    </button>
  );
}
