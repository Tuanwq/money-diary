import { X } from "lucide-react";
import { useEffect, useRef, type FormEvent } from "react";
import type { BalanceCheckEntry } from "../../../../types";
import {
  BalanceCheckForm,
  type BalanceCheckFormValue,
} from "./BalanceCheckForm";
import { BalanceCheckDetails } from "./BalanceCheckDetails";

export type BalanceCheckOverlayMode = "details" | "edit";

type BalanceCheckOverlayProps = {
  appMoney: number;
  balanceCheck?: BalanceCheckEntry;
  form: BalanceCheckFormValue;
  isOpen: boolean;
  isSubmitting: boolean;
  maxDate: string;
  mode: BalanceCheckOverlayMode;
  onBankChange: (value: string) => void;
  onCashChange: (value: string) => void;
  onDateChange: (date: string) => void;
  onNoteChange: (value: string) => void;
  onRequestClose: () => void;
  onStartEditing: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BalanceCheckOverlay({
  appMoney,
  balanceCheck,
  form,
  isOpen,
  isSubmitting,
  maxDate,
  mode,
  onBankChange,
  onCashChange,
  onDateChange,
  onNoteChange,
  onRequestClose,
  onStartEditing,
  onSubmit,
}: BalanceCheckOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeHandlerRef = useRef(onRequestClose);

  useEffect(() => {
    closeHandlerRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const returnFocusElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled])"
        )
        ?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHandlerRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusElement?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showDetails = mode === "details" && balanceCheck;
  const title = showDetails ? "Chi tiết kiểm kê" : "Kiểm kê số dư";

  return (
    <div className="money-balance-overlay-layer" role="presentation">
      <div className="money-balance-overlay-backdrop" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="money-balance-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="money-balance-overlay-title"
        aria-describedby="money-balance-overlay-description"
      >
        <header className="money-balance-overlay-header">
          <div>
            <h2 id="money-balance-overlay-title">{title}</h2>
            <p id="money-balance-overlay-description">
              {showDetails
                ? "Xem số dư đã đối chiếu và ghi chú riêng tư của bản kiểm kê."
                : "Đối chiếu tiền mặt và tài khoản với số tiền ứng dụng đang tính."}
            </p>
          </div>
          <button
            type="button"
            className="money-icon-button"
            aria-label="Đóng kiểm kê"
            onClick={onRequestClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        {showDetails ? (
          <BalanceCheckDetails
            balanceCheck={balanceCheck}
            onClose={onRequestClose}
            onEdit={onStartEditing}
          />
        ) : (
          <BalanceCheckForm
            appMoney={appMoney}
            form={form}
            isSubmitting={isSubmitting}
            maxDate={maxDate}
            onBankChange={onBankChange}
            onCancel={onRequestClose}
            onCashChange={onCashChange}
            onDateChange={onDateChange}
            onNoteChange={onNoteChange}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}
