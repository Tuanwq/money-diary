import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { calculateAccountBalance } from "../../account-ledger/accountLedgerModel.ts";
import type { ExpenseBudget } from "../../../types.ts";

export type SpendingJar = {
  id: string;
  name: string;
  icon: string;
  color?: string;
  limitAmount: number;
  startDate: string;
  endDate?: string;
  linkedLabels: string[];
  status: "active" | "closed";
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
    const balance = account ? calculateAccountBalance(account, ledger.transactions) : 0;
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
  return Math.max(0, calculateAccountBalance(account, ledger.transactions) - getAccountAllocation(ledger, accountId));
}

/** Deterministic, additive migration: legacy budgets stay untouched for recovery. */
export function migrateExpenseBudgets(ledger: JarLedger, budgets: ExpenseBudget[], now: string): JarLedger {
  const ids = new Set(ledger.jars.map((jar) => jar.id));
  const added = budgets.filter((budget) => !ids.has(`legacy-budget:${budget.id}`))
    .map((budget): SpendingJar => ({
      id: `legacy-budget:${budget.id}`, name: budget.label, icon: "🏷️",
      limitAmount: budget.monthlyLimit, startDate: now.slice(0, 7) + "-01",
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
