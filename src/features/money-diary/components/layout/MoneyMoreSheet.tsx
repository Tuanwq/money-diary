import {
  Bot,
  BookCheck,
  ClipboardCheck,
  FileClock,
  FileText,
  LogOut,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import type { RefObject } from "react";
import { ThemeToggle } from "../../../../components/ThemeToggle";
import type { ThemeMode } from "../../../../hooks/useThemeMode";
import { MoneyBottomSheet } from "./MoneyBottomSheet";

type MoneyMoreSheetProps = {
  email?: string;
  isOpen: boolean;
  onClose: () => void;
  onExportReport: () => void;
  onLogout: () => void;
  onOpenAnalysis: () => void;
  onOpenBalanceChecks: () => void;
  onOpenChangeLog: () => void;
  onOpenCloseDay: () => void;
  onSwitchApp: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

export function MoneyMoreSheet({
  email,
  isOpen,
  onClose,
  onExportReport,
  onLogout,
  onOpenAnalysis,
  onOpenBalanceChecks,
  onOpenChangeLog,
  onOpenCloseDay,
  onSwitchApp,
  returnFocusRef,
  themeMode,
  toggleThemeMode,
}: MoneyMoreSheetProps) {
  const actions = [
    { icon: BookCheck, label: "Chốt ngày", onClick: onOpenCloseDay },
    {
      icon: Bot,
      label: "Phân tích tài chính",
      onClick: onOpenAnalysis,
    },
    { icon: FileText, label: "Xuất báo cáo Word", onClick: onExportReport },
    {
      icon: ClipboardCheck,
      label: "Kiểm kê số dư",
      onClick: onOpenBalanceChecks,
    },
    {
      icon: FileClock,
      label: "Lịch sử thay đổi",
      onClick: onOpenChangeLog,
    },
    { icon: RefreshCcw, label: "Đổi chức năng", onClick: onSwitchApp },
    { icon: LogOut, label: "Đăng xuất", onClick: onLogout, danger: true },
  ];

  return (
    <MoneyBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Thêm"
      description="Báo cáo, tài khoản và các công cụ ít dùng hơn."
    >
      <div className="money-account-summary">
        <span className="money-account-summary-icon" aria-hidden="true">
          <UserRound size={22} />
        </span>
        <span className="money-account-summary-copy">
          <small>Tài khoản</small>
          <strong>{email ?? "Money Diary"}</strong>
        </span>
      </div>

      <div className="money-more-theme-row">
        <span>Cài đặt giao diện</span>
        <ThemeToggle
          themeMode={themeMode}
          toggleThemeMode={toggleThemeMode}
        />
      </div>

      <div className="money-more-action-list">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              className={`money-more-action ${action.danger ? "is-danger" : ""}`}
              onClick={() => {
                onClose();
                action.onClick();
              }}
            >
              <Icon aria-hidden="true" size={20} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </MoneyBottomSheet>
  );
}
