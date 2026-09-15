import type { DailyFinancialSummary } from "../types/photoFinance.ts";
import { formatCalendarNet } from "../services/photoFinanceModel.ts";

export function CalendarNetCell({ summary }: { summary: DailyFinancialSummary }) {
  if (!summary.hasData) return <span className="photo-finance-net is-empty">—</span>;
  return <span className={`photo-finance-net ${summary.net > 0 ? "is-positive" :
    summary.net < 0 ? "is-negative" : "is-zero"}`}>
    {formatCalendarNet(summary.net)}
  </span>;
}
