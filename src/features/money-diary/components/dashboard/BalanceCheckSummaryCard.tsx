import { ClipboardCheck, FileText, Scale } from "lucide-react";
import type { BalanceCheckEntry } from "../../../../types";
import { getBalanceStatus } from "../../../../utils/balance";
import { formatReportDate } from "../../../../utils/date";
import { formatMoney, formatSignedMoney } from "../../../../utils/money";
import { DashboardSectionState } from "./DashboardSectionState";

type BalanceCheckSummaryCardProps = {
  balanceCheck?: BalanceCheckEntry;
  isLoading?: boolean;
  isSelectedToday: boolean;
  onOpenDetails: () => void;
  onOpenEditor: () => void;
  selectedDate: string;
};

function formatCheckTime(check: BalanceCheckEntry) {
  const timestamp = check.updatedAt ?? check.createdAt;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function BalanceCheckSummaryCard({
  balanceCheck,
  isLoading,
  isSelectedToday,
  onOpenDetails,
  onOpenEditor,
  selectedDate,
}: BalanceCheckSummaryCardProps) {
  const status = balanceCheck ? getBalanceStatus(balanceCheck.difference) : null;
  const statusText = balanceCheck
    ? balanceCheck.difference === 0
      ? status
      : `${status} ${formatMoney(Math.abs(balanceCheck.difference))}`
    : null;
  const checkedAt = balanceCheck ? formatCheckTime(balanceCheck) : null;

  return (
    <section className="money-card money-balance-summary" aria-labelledby="balance-summary-title">
      <div className="money-section-heading money-balance-summary-heading">
        <div>
          <span className="money-eyebrow">
            <Scale aria-hidden="true" size={16} />
            Đối chiếu số dư
          </span>
          <h2 id="balance-summary-title">Kiểm kê số dư</h2>
        </div>
        {statusText && !isLoading && (
          <strong className={`money-balance-summary-status ${
            balanceCheck?.difference === 0
              ? "is-matched"
              : balanceCheck && balanceCheck.difference > 0
                ? "is-surplus"
                : "is-shortage"
          }`}>
            {statusText}
          </strong>
        )}
      </div>

      {isLoading ? (
        <DashboardSectionState isLoading variant="compact" />
      ) : balanceCheck ? (
        <>
          <dl className="money-balance-summary-values">
            <div>
              <dt>App ước tính</dt>
              <dd>{formatMoney(balanceCheck.appMoney)}</dd>
            </div>
            <div>
              <dt>Bạn kiểm kê</dt>
              <dd>{formatMoney(balanceCheck.actualMoney)}</dd>
            </div>
            <div className="is-difference">
              <dt>Chênh lệch</dt>
              <dd>{formatSignedMoney(balanceCheck.difference)}</dd>
            </div>
          </dl>

          <div className="money-balance-summary-meta">
            <span>
              Kiểm kê: {isSelectedToday ? "Hôm nay" : formatReportDate(selectedDate)}
              {checkedAt ? `, ${checkedAt}` : ""}
            </span>
            {balanceCheck.note && (
              <span aria-label="Bản kiểm kê này có ghi chú">
                <FileText aria-hidden="true" size={15} />
                Có ghi chú
              </span>
            )}
          </div>

          <div className="money-balance-summary-actions">
            <button type="button" className="money-secondary-action" onClick={onOpenDetails}>
              Xem chi tiết
            </button>
            <button type="button" className="money-primary-action" onClick={onOpenEditor}>
              Kiểm kê lại
            </button>
          </div>
        </>
      ) : (
        <div className="money-balance-summary-empty">
          <span aria-hidden="true"><ClipboardCheck size={23} /></span>
          <div>
            <strong>Bạn chưa đối chiếu số dư ngày này</strong>
            <p>Việc kiểm kê giúp số tiền trong ứng dụng chính xác hơn.</p>
          </div>
          <button type="button" className="money-primary-action" onClick={onOpenEditor}>
            Kiểm kê ngay
          </button>
        </div>
      )}
    </section>
  );
}
