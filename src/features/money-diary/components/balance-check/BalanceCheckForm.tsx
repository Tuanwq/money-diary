import { useState, type FormEvent } from "react";
import { getBalanceStatus } from "../../../../utils/balance";
import {
  formatMoney,
  formatMoneyInput,
  formatSignedMoney,
  parseMoneyInput,
} from "../../../../utils/money";

export type BalanceCheckFormValue = {
  bank: string;
  cash: string;
  date: string;
  note: string;
};

type BalanceCheckFormProps = {
  appMoney: number;
  form: BalanceCheckFormValue;
  isSubmitting: boolean;
  maxDate: string;
  onBankChange: (value: string) => void;
  onCancel: () => void;
  onCashChange: (value: string) => void;
  onDateChange: (date: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BalanceCheckForm({
  appMoney,
  form,
  isSubmitting,
  maxDate,
  onBankChange,
  onCancel,
  onCashChange,
  onDateChange,
  onNoteChange,
  onSubmit,
}: BalanceCheckFormProps) {
  const [dateError, setDateError] = useState("");
  const cash = parseMoneyInput(form.cash);
  const bank = parseMoneyInput(form.bank);
  const checkedMoney = cash + bank;
  const difference = checkedMoney - appMoney;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!form.date) {
      event.preventDefault();
      setDateError("Hãy chọn ngày kiểm kê.");
      return;
    }

    onSubmit(event);
  }

  return (
    <form className="money-balance-form" onSubmit={handleSubmit} noValidate>
      <div className="money-balance-overlay-content">
        <div className="money-balance-form-fields">
          <div className="money-form-field">
            <label htmlFor="money-balance-date">Ngày kiểm kê</label>
            <input
              id="money-balance-date"
              type="date"
              value={form.date}
              max={maxDate}
              aria-invalid={Boolean(dateError)}
              aria-describedby={dateError ? "money-balance-date-error" : undefined}
              onChange={(event) => {
                setDateError("");
                onDateChange(event.target.value);
              }}
              className="money-form-input"
            />
            {dateError && (
              <span id="money-balance-date-error" className="money-form-error">
                {dateError}
              </span>
            )}
          </div>

          <div className="money-form-field">
            <label htmlFor="money-balance-cash">Tiền mặt</label>
            <input
              id="money-balance-cash"
              type="text"
              inputMode="numeric"
              value={form.cash}
              onChange={(event) => onCashChange(formatMoneyInput(event.target.value))}
              placeholder="Ví dụ: 500.000"
              className="money-form-input"
            />
          </div>

          <div className="money-form-field">
            <label htmlFor="money-balance-bank">Tiền tài khoản</label>
            <input
              id="money-balance-bank"
              type="text"
              inputMode="numeric"
              value={form.bank}
              onChange={(event) => onBankChange(formatMoneyInput(event.target.value))}
              placeholder="Ví dụ: 3.000.000"
              className="money-form-input"
            />
          </div>
        </div>

        <dl className="money-balance-form-calculation">
          <div>
            <dt>App tính hiện có</dt>
            <dd>{formatMoney(appMoney)}</dd>
          </div>
          <div>
            <dt>Bạn kiểm kê</dt>
            <dd>{formatMoney(checkedMoney)}</dd>
          </div>
          <div>
            <dt>{getBalanceStatus(difference)}</dt>
            <dd>{formatSignedMoney(difference)}</dd>
          </div>
        </dl>

        <p className="money-balance-form-formula">
          Tiền mặt + tiền tài khoản = số dư bạn kiểm kê. Chênh lệch được so với số tiền app đang tính.
        </p>

        <div className="money-form-field">
          <label htmlFor="money-balance-note">Ghi chú kiểm kê</label>
          <textarea
            id="money-balance-note"
            value={form.note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Ví dụ: còn một khoản chuyển khoản chưa ghi..."
            className="money-form-input money-balance-note-input"
          />
        </div>
      </div>

      <footer className="money-balance-overlay-footer">
        <button type="button" className="money-secondary-action" onClick={onCancel}>
          Hủy
        </button>
        <button
          type="submit"
          className="money-primary-action"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : "Lưu kiểm kê"}
        </button>
      </footer>
    </form>
  );
}
