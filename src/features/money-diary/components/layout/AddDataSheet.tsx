import { ClipboardCheck, PackagePlus, ReceiptText } from "lucide-react";
import type { RefObject } from "react";
import { MoneyBottomSheet } from "./MoneyBottomSheet";

type AddDataSheetProps = {
  isOpen: boolean;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onCheckBalance: () => void;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

export function AddDataSheet({
  isOpen,
  onAddExpense,
  onAddIncome,
  onCheckBalance,
  onClose,
  returnFocusRef,
}: AddDataSheetProps) {
  const actions = [
    {
      description: "Ghi lại khoản tiền bạn vừa nhận được.",
      icon: PackagePlus,
      label: "Nhập thu nhập",
      onClick: onAddIncome,
    },
    {
      description: "Ghi lại khoản tiền bạn vừa chi.",
      icon: ReceiptText,
      label: "Thêm chi tiêu",
      onClick: onAddExpense,
    },
    {
      description: "Cập nhật số dư hiện tại của bạn.",
      icon: ClipboardCheck,
      label: "Kiểm kê số dư",
      onClick: onCheckBalance,
    },
  ];

  return (
    <MoneyBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Bạn muốn ghi gì?"
      description="Chọn loại dữ liệu để tiếp tục với biểu mẫu hiện có."
    >
      <div className="money-sheet-action-list">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              className="money-sheet-action"
              onClick={() => {
                onClose();
                action.onClick();
              }}
            >
              <span className="money-sheet-action-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <span className="money-sheet-action-copy">
                <strong>{action.label}</strong>
                <small>{action.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </MoneyBottomSheet>
  );
}
