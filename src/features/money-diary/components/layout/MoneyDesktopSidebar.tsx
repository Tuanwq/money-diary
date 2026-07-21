import {
  BookOpenText,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileText,
  Goal,
  History,
  House,
  LogOut,
  PackagePlus,
  ReceiptText,
  RefreshCcw,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RefObject } from "react";
import type { GoalScreen, Page } from "../../../../types";
import { MoneySyncStatus } from "./MoneySyncStatus";

type MoneyDesktopSidebarProps = {
  addButtonRef: RefObject<HTMLButtonElement | null>;
  currentPage: Page;
  email?: string;
  isCloudRefreshing: boolean;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
  onExportReport: () => void;
  onLogout: () => void;
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
  addButtonRef,
  currentPage,
  email,
  isCloudRefreshing,
  navigateTo,
  onExportReport,
  onLogout,
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
      active: currentPage === "goals",
      icon: Goal,
      label: "Mục tiêu",
      onClick: () => navigateTo("goals", "menu"),
    },
    {
      active: currentPage === "closeDay",
      icon: BookOpenText,
      label: "Ghi chép",
      onClick: () => navigateTo("closeDay"),
    },
    {
      active: currentPage === "hub",
      icon: PackagePlus,
      label: "Thu nhập",
      onClick: () => navigateTo("hub"),
    },
    {
      active: currentPage === "expenses" || currentPage === "entry",
      icon: ReceiptText,
      label: "Chi tiêu",
      onClick: () => navigateTo("expenses"),
    },
    {
      active: currentPage === "history",
      icon: History,
      label: "Lịch sử",
      onClick: () => navigateTo("history"),
    },
    {
      active: currentPage === "balanceChecks",
      icon: ClipboardCheck,
      label: "Kiểm kê",
      onClick: () => navigateTo("balanceChecks"),
    },
    {
      active: false,
      icon: FileText,
      label: "Báo cáo",
      onClick: onExportReport,
    },
  ];

  return (
    <aside className="money-desktop-sidebar">
      <div className="money-sidebar-brand">
        <span className="money-brand-mark" aria-hidden="true">M</span>
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
        <button ref={settingsButtonRef} type="button" className="money-sidebar-link" onClick={onOpenSettings}>
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

        <div className="money-sidebar-account" title={email}>
          <span className="money-sidebar-avatar" aria-hidden="true">
            <ChartNoAxesCombined size={18} />
          </span>
          <span className="money-sidebar-account-copy">
            <small>Tài khoản</small>
            <strong>{email ?? "Money Diary"}</strong>
          </span>
        </div>
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
