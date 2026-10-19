import { Camera, PackagePlus, ReceiptText, WalletCards } from "lucide-react";
import type { RefObject } from "react";
import { MoneyBottomSheet } from "./MoneyBottomSheet";

type AddDataSheetProps = {
  isOpen: boolean;
  legacyMoneyToolsVisible: boolean;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onCapturePhoto: () => void;
  onOpenAccountLedger: () => void;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

export function AddDataSheet({
  isOpen,
  legacyMoneyToolsVisible,
  onAddExpense,
  onAddIncome,
  onCapturePhoto,
  onOpenAccountLedger,
  onClose,
  returnFocusRef,
}: AddDataSheetProps) {
  const actions = [
    ...(legacyMoneyToolsVisible ? [{
      description: "Ghi lại khoản tiền bạn vừa nhận được.",
      icon: PackagePlus,
      label: "Nhập thu nhập",
      onClick: onAddIncome,
    }, {
      description: "Ghi lại khoản tiền bạn vừa chi.",
      icon: ReceiptText,
      label: "Thêm chi tiêu",
      onClick: onAddExpense,
    }] : []),
    {
      description: "Mở Sổ tài khoản để thêm thu, chi hoặc chuyển tiền.",
      icon: WalletCards,
      label: "Sổ tài khoản",
      onClick: onOpenAccountLedger,
    },
    {
      description: "Chụp ảnh và ghi lại giao dịch.",
      icon: Camera,
      label: "Chụp ảnh",
      onClick: onCapturePhoto,
    },
  ];

  return (
    <MoneyBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Bạn muốn ghi gì?"
      description="Chọn cách ghi lại khoản tiền của bạn."
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
