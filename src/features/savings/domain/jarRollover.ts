import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import { getJarView } from "../../spending-jars/domain/jarModel.ts";

export function getPendingJarRollover(ledger: AccountLedgerData, today: string) {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
    return { period: "", jars: [] };
  const previousEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
  const period = previousEnd.slice(0, 7);
  const previousStart = `${period}-01`;
  const currentStart = `${today.slice(0, 7)}-01`;
  const currentStartTime = new Date(`${currentStart}T00:00:00`).getTime();
  const priorLedger = { ...ledger,
    transactions: ledger.transactions.filter((item) => item.date < currentStart),
    jarActivities: ledger.jarActivities.filter((item) => {
      const time = Date.parse(item.createdAt);
      return !Number.isFinite(time) || time < currentStartTime;
    }) };
  const handled = new Set((ledger.savingsAllocations ?? [])
    .filter((item) => item.origin === "jar_rollover" && item.period === period)
    .map((item) => item.jarId));
  const jars = ledger.jars.filter((jar) => jar.status === "active" && !handled.has(jar.id) &&
    jar.startDate <= previousEnd && (
      (jar.budgetPeriod === "monthly" && (!jar.endDate || jar.endDate >= previousStart)) ||
      (jar.endDate?.startsWith(period) ?? false)))
    .map((jar) => {
      const prior = new Map(getJarView(priorLedger, jar).sources
        .map((source) => [source.accountId, source.amount]));
      const sources = getJarView(ledger, jar).sources.map((source) => ({
        accountId: source.accountId,
        amount: Math.min(source.amount, prior.get(source.accountId) ?? 0),
      })).filter((source) => source.amount > 0);
      return { jar, sources, amount: sources.reduce((sum, source) => sum + source.amount, 0) };
    }).filter((item) => item.amount > 0);
  return { period, jars };
}
