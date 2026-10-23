import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { calculateAccountBalance, isExpenseReversal } from "../../account-ledger/accountLedgerModel.ts";
import { calculateAccountExternalAmount } from "../../account-ledger/accountExternalModel.ts";
import type { ExpenseBudget } from "../../../types.ts";

export type SpendingJar = {
  id: string;
  name: string;
  icon: string;
  color?: string;
  limitAmount: number;
  /** Undefined on old hand-created jars: their previous total cap stays a legacy rule. */
  budgetPeriod?: "monthly" | "custom" | "legacy_total";
  startDate: string;
  endDate?: string;
  linkedLabels: string[];
  status: "active" | "closed" | "deleted";
  legacyBudgetId?: string;
  createdAt: string;
  updatedAt: string;
};

export type JarActivity = {
  id: string;
  jarId: string;
  kind: "allocate" | "release" | "transfer_in" | "transfer_out" | "spend" | "refund" | "close";
  accountId?: string;
  /** Only allocation movements carry an amount; spend/refund read their ledger transaction. */
  amount?: number;
  relatedJarId?: string;
  transactionIds?: string[];
  note?: string;
  createdAt: string;
};

export type JarLedger = {
  accounts: FinancialAccount[];
  transactions: AccountTransaction[];
  jars: SpendingJar[];
  jarActivities: JarActivity[];
  savingsAllocations?: import("../../savings/domain/savingsModel.ts").SavingsAllocation[];
};

export type JarSource = { accountId: string; amount: number };
export type JarView = {
  jar: SpendingJar;
  sources: JarSource[];
  remainingAmount: number;
  spentAmount: number;
  fundedAmount: number;
  deficitAmount: number;
};

export type JarBudgetView = {
  spent: number;
  remaining: number;
  overage: number;
  usedPercent: number;
  periodLabel: string;
  needsPeriodReview: boolean;
};

/** Budget is a spending plan, independent of cash still reserved in the jar. */
export function getJarBudgetRange(jar: SpendingJar, asOfDate: string) {
  const period = jar.budgetPeriod ?? "legacy_total";
  const start = period === "monthly" ? `${asOfDate.slice(0, 7)}-01` : jar.startDate;
  const [year, month] = asOfDate.slice(0, 7).split("-").map(Number);
  const end = period === "monthly"
    ? `${asOfDate.slice(0, 7)}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`
    : jar.endDate ?? asOfDate;
  const fromDate = start < jar.startDate ? jar.startDate : start;
  const toDate = jar.endDate && end > jar.endDate ? jar.endDate : end;
  return { fromDate, toDate };
}

export function getJarBudgetView(ledger: JarLedger, jar: SpendingJar, asOfDate: string): JarBudgetView {
  const period = jar.budgetPeriod ?? "legacy_total";
  const { fromDate, toDate } = getJarBudgetRange(jar, asOfDate);
  const spent = ledger.transactions.reduce((sum, transaction) =>
    transaction.jarId === jar.id && transaction.type === "expense" &&
    transaction.date >= fromDate && transaction.date <= toDate ? sum + transaction.amount : sum, 0);
  const refunds = ledger.transactions.reduce((sum, transaction) =>
    transaction.jarId === jar.id && isExpenseReversal(transaction) &&
    transaction.date >= fromDate && transaction.date <= toDate ? sum + transaction.amount : sum, 0);
  const netSpent = Math.max(0, spent - refunds);
  return {
    spent: netSpent,
    remaining: Math.max(0, jar.limitAmount - netSpent),
    overage: Math.max(0, netSpent - jar.limitAmount),
    usedPercent: jar.limitAmount > 0 ? Math.round(netSpent / jar.limitAmount * 100) : 0,
    periodLabel: period === "monthly" ? `Tháng ${asOfDate.slice(5, 7)}/${asOfDate.slice(0, 4)}`
      : period === "custom" ? "Kỳ đã chọn" : "Hạn mức cũ · toàn kỳ",
    needsPeriodReview: period === "legacy_total" && !jar.legacyBudgetId,
  };
}

/** The progress bar represents money still available in the jar, not money spent. */
export function getJarRemainingPercent(view: JarView): number {
  const everHeldForSpending = Math.max(0, view.remainingAmount) + Math.max(0, view.spentAmount);
  if (everHeldForSpending <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(view.remainingAmount / everHeldForSpending * 100)));
}

export function getJarView(ledger: JarLedger, jar: SpendingJar): JarView {
  const balances = new Map<string, number>();
  const transactions = new Map(ledger.transactions.map((item) => [item.id, item]));
  let spentAmount = 0;
  let fundedAmount = 0;
  for (const activity of ledger.jarActivities) {
    if (activity.jarId !== jar.id) continue;
    if (activity.kind === "spend" || activity.kind === "refund") {
      for (const id of activity.transactionIds ?? []) {
        const transaction = transactions.get(id);
        if (!transaction || transaction.jarId !== jar.id || transaction.jarActivityId !== activity.id) continue;
        const direction = activity.kind === "spend" && transaction.type === "expense" ? -1
          : activity.kind === "refund" && transaction.type === "income" ? 1 : 0;
        if (!direction) continue;
        balances.set(transaction.accountId, (balances.get(transaction.accountId) ?? 0) + direction * transaction.amount);
        spentAmount -= direction * transaction.amount;
      }
      continue;
    }
    const amount = activity.amount ?? 0;
    const direction = activity.kind === "allocate" || activity.kind === "transfer_in" ? 1
      : activity.kind === "release" || activity.kind === "transfer_out" ? -1 : 0;
    if (direction && activity.accountId) {
      balances.set(activity.accountId, (balances.get(activity.accountId) ?? 0) + direction * amount);
      if (activity.kind === "allocate") fundedAmount += amount;
    }
  }
  const sources = [...balances.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([accountId, amount]) => ({ accountId, amount }));
  const remainingAmount = sources.reduce((sum, source) => sum + source.amount, 0);
  const deficitAmount = sources.reduce((sum, source) => {
    const account = ledger.accounts.find((item) => item.id === source.accountId);
    const balance = account ? calculateAccountBalance(account, ledger.transactions) - calculateAccountExternalAmount(account) : 0;
    return sum + Math.max(0, source.amount - Math.max(balance, 0));
  }, 0);
  return { jar, sources, remainingAmount, spentAmount, fundedAmount, deficitAmount };
}

export function getAccountAllocation(ledger: JarLedger, accountId: string) {
  return ledger.jars.filter((jar) => jar.status === "active")
    .reduce((sum, jar) => sum + Math.max(0, getJarView(ledger, jar).sources
      .find((source) => source.accountId === accountId)?.amount ?? 0), 0);
}

export function getAccountAvailableToAllocate(ledger: JarLedger, accountId: string) {
  const account = ledger.accounts.find((item) => item.id === accountId && !item.archivedAt);
  if (!account) return 0;
  if (account.budgetEligibility !== "eligible") return 0;
  return Math.max(0, calculateAccountBalance(account, ledger.transactions) -
    calculateAccountExternalAmount(account) - getAccountAllocation(ledger, accountId) -
    (ledger.savingsAllocations ?? []).filter((item) => item.sourceAccountId === accountId &&
      (item.status === "allocated" || (item.status === "needs_recalculation" && item.previousStatus === "allocated")))
      .reduce((sum, item) => sum + item.amount, 0));
}

/** Deterministic, additive migration: legacy budgets stay untouched for recovery. */
export function migrateExpenseBudgets(ledger: JarLedger, budgets: ExpenseBudget[], now: string): JarLedger {
  const ids = new Set(ledger.jars.map((jar) => jar.id));
  const added = budgets.filter((budget) => !ids.has(`legacy-budget:${budget.id}`))
    .map((budget): SpendingJar => ({
      id: `legacy-budget:${budget.id}`, name: budget.label, icon: "🏷️",
      limitAmount: budget.monthlyLimit, budgetPeriod: "monthly", startDate: now.slice(0, 7) + "-01",
      linkedLabels: [budget.label], status: "active", legacyBudgetId: budget.id,
      createdAt: budget.createdAt, updatedAt: budget.updatedAt ?? budget.createdAt,
    }));
  return added.length ? { ...ledger, jars: [...ledger.jars, ...added] } : ledger;
}

export function suggestJar(ledger: JarLedger, label: string) {
  const normalized = label.trim().toLocaleLowerCase("vi-VN");
  return ledger.jars.find((jar) => jar.status === "active" &&
    jar.linkedLabels.some((item) => item.trim().toLocaleLowerCase("vi-VN") === normalized));
}
