import { ArrowLeftRight, CirclePlus, ChevronRight, ClipboardCheck, PackagePlus, ReceiptText } from "lucide-react";
import type { RefObject } from "react";
import { MoneyBottomSheet } from "./MoneyBottomSheet";
import "./addDataSheet.css";

type AddDataSheetProps = {
  isOpen: boolean;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onAddTransfer: () => void;
  onCheckBalance: () => void;
  onOpenHub: () => void;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

export function AddDataSheet({
  isOpen,
  onAddExpense,
  onAddIncome,
  onAddTransfer,
  onCheckBalance,
  onOpenHub,
  onClose,
  returnFocusRef,
}: AddDataSheetProps) {
  const actions = [
    {
      description: "Tiền vừa nhận vào tài khoản.",
      icon: CirclePlus,
      label: "Thu nhập",
      onClick: onAddIncome,
    },
    {
      description: "Tiền vừa chi ra.",
      icon: ReceiptText,
      label: "Chi tiêu",
      onClick: onAddExpense,
    },
    {
      description: "Di chuyển giữa các tài khoản.",
      icon: ArrowLeftRight,
      label: "Chuyển nội bộ",
      onClick: onAddTransfer,
    },
  ];

  return (
    <MoneyBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Bạn muốn thêm gì?"
      description="Ghi nhanh một thay đổi tài chính."
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
      <div className="money-sheet-secondary-actions">
        <span>Thao tác khác</span>
        <button type="button" onClick={() => { onClose(); onCheckBalance(); }}>
          <ClipboardCheck size={18} aria-hidden="true" /> Kiểm kê số dư <ChevronRight size={17} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => { onClose(); onOpenHub(); }}>
          <PackagePlus size={18} aria-hidden="true" /> Ca HUB <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </MoneyBottomSheet>
  );
}
