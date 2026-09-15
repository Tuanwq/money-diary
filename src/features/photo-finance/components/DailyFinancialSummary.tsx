import type { DailyFinancialSummary as Summary } from "../types/photoFinance.ts";
import { formatMoney } from "../../../utils/money.ts";

export function DailyFinancialSummary({ summary }: { summary: Summary }) {
  return <section className="photo-finance-daily-summary" aria-label="Tổng kết tài chính trong ngày">
    <div><span>Thu</span><strong>+{formatMoney(summary.income)}</strong></div>
    <div><span>Chi</span><strong>−{formatMoney(summary.expense)}</strong></div>
    <div><span>Thực nhận</span><strong>{summary.net > 0 ? "+" : summary.net < 0 ? "−" : ""}{formatMoney(Math.abs(summary.net))}</strong></div>
  </section>;
}
