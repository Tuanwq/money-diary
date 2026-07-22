import { formatMoney } from "../../../../utils/money";

type ShiftFilterSummaryProps = {
  rangeLabel: string;
  hubLabel: string;
  count: number;
  income: number;
  orders: number;
  hours: number;
};

export function ShiftFilterSummary({
  rangeLabel,
  hubLabel,
  count,
  income,
  orders,
  hours,
}: ShiftFilterSummaryProps) {
  const formattedHours = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(hours);

  return (
    <section className="hub-shift-filter-summary" aria-live="polite">
      <span>Đang xem <strong>{rangeLabel}</strong></span>
      <p><strong>{count} ca</strong><span aria-hidden="true"> · </span>{formatMoney(income)}<span aria-hidden="true"> · </span>{hubLabel}</p>
      <small>{orders} đơn · {formattedHours} giờ làm</small>
    </section>
  );
}
