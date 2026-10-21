import { ChevronRight } from "lucide-react";
import { getJarDetailPresentation } from "../domain/jarPresentation.ts";
import { formatMoney } from "../../../utils/money.ts";

type Presentation = ReturnType<typeof getJarDetailPresentation>;
const statusLabels: Record<Presentation["status"], string> = {
  source_shortfall: "Nguồn thiếu tiền", over_budget: "Vượt ngân sách",
  low_budget: "Sắp hết ngân sách", period_ending: "Sắp hết kỳ",
  unfunded: "Chưa nạp tiền", active: "Đang dùng", closed: "Đã đóng",
};

export function JarCard({ presentation: item, onOpen }: {
  presentation: Presentation; onOpen: () => void;
}) {
  const tone = item.priority === 0 ? "is-empty" : item.priority <= 2 ? "is-low" : "is-active";
  const budgetLabel = item.period === "monthly" ? "Còn ngân sách tháng này"
    : item.period === "custom" ? "Còn ngân sách kỳ này" : "Còn hạn mức toàn kỳ";
  const warning = item.view.deficitAmount > 0 ? `Tài khoản nguồn thiếu ${formatMoney(item.view.deficitAmount)}`
    : item.budget.overage > 0 ? `Đã vượt hạn mức ${formatMoney(item.budget.overage)}`
      : item.budget.needsPeriodReview ? "Hũ cũ cần chọn lại kỳ ngân sách" : null;

  return <button className={`jar-card ${tone}`} onClick={onOpen} type="button"
    aria-label={`Xem hũ ${item.jar.name}, ${budgetLabel.toLowerCase()} ${formatMoney(item.budget.remaining)}`}>
    <span className="jar-card-top"><span className="jar-card-identity">
      <span className="jar-card-icon" aria-hidden="true">{item.jar.icon}</span>
      <span className="jar-card-name">{item.jar.name}</span></span>
      <span className={`jar-status ${tone}`}>{statusLabels[item.status]}</span></span>
    <span className="jar-card-main"><small>{budgetLabel}</small><strong>{formatMoney(item.budget.remaining)}</strong></span>
    <span className="jar-card-progress-copy"><span>Đã chi {formatMoney(item.budget.spent)} / {formatMoney(item.jar.limitAmount)}</span>
      <span>{item.budgetRemainingPercent}% còn lại</span></span>
    <span className="jar-progress" role="progressbar" aria-label={`Ngân sách còn lại của hũ ${item.jar.name}`}
      aria-valuenow={item.budgetRemainingPercent} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${item.budgetRemainingPercent}%` }} /></span>
    <span className="jar-card-foot"><span>{item.daysRemaining !== null ? `${item.daysRemaining} ngày còn lại` : item.budget.periodLabel}</span>
      <ChevronRight aria-hidden="true" size={18} /></span>
    {warning && <span className="jar-card-deficit">{warning}</span>}
  </button>;
}
