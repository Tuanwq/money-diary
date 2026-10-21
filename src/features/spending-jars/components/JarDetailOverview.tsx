import { WalletCards } from "lucide-react";
import { getJarDetailPresentation } from "../domain/jarPresentation.ts";
import { formatMoney } from "../../../utils/money.ts";

export function JarDetailOverview({ item, accountNames }: {
  item: ReturnType<typeof getJarDetailPresentation>;
  accountNames: Map<string, string>;
}) {
  const periodLabel = item.period === "monthly" ? "tháng này"
    : item.period === "custom" ? "kỳ này" : "toàn kỳ";
  const sources = item.view.sources.filter((source) => source.amount > 0);
  const difference = item.fundingDifference;
  if (item.jar.status === "closed") return <section className="jar-detail-hero" aria-label="Hũ đã đóng">
    <span className="jar-detail-eyebrow">Hũ đã đóng</span>
    <strong className="jar-detail-amount">{formatMoney(Math.max(0, item.view.spentAmount))}</strong>
    <p className="jar-detail-period">Đã chi từ hũ trong thời gian sử dụng. Tiền chưa tiêu đã được giải phóng về tài khoản.</p>
  </section>;
  return <>
    <section className="jar-detail-hero" aria-label="Ngân sách hũ">
      <span className="jar-detail-eyebrow">{item.period === "legacy_total" ? "Còn hạn mức toàn kỳ" : `Còn ngân sách ${periodLabel}`}</span>
      <strong className="jar-detail-amount">{formatMoney(item.budget.remaining)}</strong>
      <div className="jar-detail-progress-label"><span>Đã chi {formatMoney(item.budget.spent)} / {formatMoney(item.jar.limitAmount)}</span>
        <span>{item.budgetRemainingPercent}% còn lại</span></div>
      <div className="jar-progress" role="progressbar" aria-label="Ngân sách còn lại"
        aria-valuenow={item.budgetRemainingPercent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${item.budgetRemainingPercent}%` }} /></div>
      <p className="jar-detail-period">{item.budget.periodLabel}
        {item.daysRemaining !== null ? ` · ${item.daysRemaining} ngày còn lại` : ""}
        {item.suggestedDailyLimit !== null && item.suggestedDailyLimit > 0
          ? ` · khoảng ${formatMoney(item.suggestedDailyLimit)}/ngày` : ""}</p>
      {item.budget.overage > 0 && <p className="jar-detail-alert">Đã vượt hạn mức {formatMoney(item.budget.overage)} trong kỳ.</p>}
      {item.budget.needsPeriodReview && <p className="jar-detail-alert">Hũ cũ dùng hạn mức toàn kỳ. Chọn kỳ ngân sách khi sửa hũ.</p>}
    </section>

    <section className="jar-funding" aria-label="Tiền thực và ngân sách">
      <h2>Tiền thực và ngân sách</h2>
      <div><span>Tiền thực trong hũ</span><strong>{formatMoney(item.heldAmount)}</strong></div>
      <div><span>Còn ngân sách {periodLabel}</span><strong>{formatMoney(item.budget.remaining)}</strong></div>
      <div className={difference < 0 ? "is-short" : "is-surplus"}>
        <span>{difference < 0 ? "Thiếu tiền thực" : "Dư tiền thực"}</span>
        <strong>{formatMoney(Math.abs(difference))}</strong>
      </div>
      {item.view.deficitAmount > 0 && <p className="jar-detail-alert">Tài khoản nguồn đang thiếu {formatMoney(item.view.deficitAmount)} so với tiền đã dành trong hũ.</p>}
    </section>

    <section className="jar-sources"><h2>Nguồn tiền</h2>
      {sources.length ? sources.map((source) => <div key={source.accountId}>
        <span><WalletCards size={16} aria-hidden="true" />{accountNames.get(source.accountId) ?? "Tài khoản đã xóa"}</span>
        <strong>{formatMoney(source.amount)}</strong>
      </div>) : <p>Chưa có tiền thực trong hũ.</p>}
    </section>
    {item.jar.status === "active" && <section className="jar-linked-labels"><h2>Nhãn liên kết</h2>
      <p>{item.jar.linkedLabels.length ? item.jar.linkedLabels.join(" · ") : "Chưa liên kết nhãn chi tiêu."}</p></section>}
  </>;
}
