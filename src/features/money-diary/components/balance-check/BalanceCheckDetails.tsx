import { FileText } from "lucide-react";
import type { BalanceCheckEntry } from "../../../../types";
import { getBalanceStatus } from "../../../../utils/balance";
import { formatReportDate } from "../../../../utils/date";
import { formatMoney, formatSignedMoney } from "../../../../utils/money";

type BalanceCheckDetailsProps = {
  balanceCheck: BalanceCheckEntry;
  onClose: () => void;
  onEdit: () => void;
};

export function BalanceCheckDetails({
  balanceCheck,
  onClose,
  onEdit,
}: BalanceCheckDetailsProps) {
  return (
    <div className="money-balance-details">
      <div className="money-balance-overlay-content">
        <div className="money-balance-detail-status">
          <span>{getBalanceStatus(balanceCheck.difference)}</span>
          <strong>{formatSignedMoney(balanceCheck.difference)}</strong>
        </div>

        <dl className="money-balance-detail-values">
          <div>
            <dt>Ngày kiểm kê</dt>
            <dd>{formatReportDate(balanceCheck.date)}</dd>
          </div>
          <div>
            <dt>Tiền mặt</dt>
            <dd>{formatMoney(balanceCheck.cash)}</dd>
          </div>
          <div>
            <dt>Tiền tài khoản</dt>
            <dd>{formatMoney(balanceCheck.bank)}</dd>
          </div>
          <div>
            <dt>App tính hiện có</dt>
            <dd>{formatMoney(balanceCheck.appMoney)}</dd>
          </div>
          <div>
            <dt>Bạn kiểm kê</dt>
            <dd>{formatMoney(balanceCheck.actualMoney)}</dd>
          </div>
          <div>
            <dt>Chênh lệch</dt>
            <dd>{formatSignedMoney(balanceCheck.difference)}</dd>
          </div>
        </dl>

        <p className="money-balance-form-formula">
          Tiền mặt + tiền tài khoản = số dư bạn kiểm kê. Chênh lệch được so với số tiền app đang tính.
        </p>

        {balanceCheck.note && (
          <section className="money-balance-private-note" aria-labelledby="balance-private-note-title">
            <div>
              <FileText aria-hidden="true" size={18} />
              <h3 id="balance-private-note-title">Ghi chú kiểm kê</h3>
            </div>
            <p>{balanceCheck.note}</p>
          </section>
        )}
      </div>

      <footer className="money-balance-overlay-footer">
        <button type="button" className="money-secondary-action" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="money-primary-action" onClick={onEdit}>
          Chỉnh sửa
        </button>
      </footer>
    </div>
  );
}
