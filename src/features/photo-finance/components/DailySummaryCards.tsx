import type { DailyFinancialSummary } from "../types/photoFinance.ts";
import { formatMoney } from "../../../utils/money.ts";

export function DailySummaryCards({ summary }: { summary: DailyFinancialSummary }) {
  return <section className="day-story-summary" aria-label="Tổng quan tài chính trong ngày">
    <div><span>Thu</span><strong>+{formatMoney(summary.income)}</strong></div>
    <div><span>Chi</span><strong className="is-outflow">−{formatMoney(summary.expense)}</strong></div>
    <div><span>Thực nhận</span><strong className={summary.net < 0 ? "is-outflow" : undefined}>
      {summary.net > 0 ? "+" : summary.net < 0 ? "−" : ""}{formatMoney(Math.abs(summary.net))}</strong></div>
  </section>;
}
