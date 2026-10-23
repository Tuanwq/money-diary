import { calculateAccountBalance, isExpenseReversal, type AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import { calculateAccountExternalAmount } from "../../account-ledger/accountExternalModel.ts";
import { getFinancialPosition } from "../../spending-jars/domain/financialPosition.ts";
import { isSavedSavingsResult } from "./savingsBalance.ts";
export { getSavingsHeldAmount, isSavedSavingsResult } from "./savingsBalance.ts";

export type SavingsMode = "percentage" | "fixed" | "random_amount" | "random_percentage";
export type SavingsRule = {
  id: string;
  name: string;
  mode: SavingsMode;
  value: number;
  minimum?: number;
  maximum?: number;
  cadence: "per_income" | "end_of_day";
  basis: "gross" | "net_work";
  dailyCap?: number;
  minimumRemaining: number;
  sourceAccountId: string;
  destination: { kind: "allocation"; goalId?: string } | { kind: "transfer"; accountId: string; goalId?: string };
  execution: "suggest" | "automatic";
  paused: boolean;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type SavingsAllocation = {
  id: string;
  ruleId: string;
  date: string;
  sourceAccountId: string;
  destination: SavingsRule["destination"];
  amount: number;
  /** A random value is sampled once for this rule and date. */
  sampledValue?: number;
  incomeSignature: string;
  /** Snapshot used by history after the income is edited or deleted. */
  incomeAmount?: number;
  workCostsAmount?: number;
  basisAmount?: number;
  ruleName?: string;
  ruleMode?: SavingsMode;
  ruleValue?: number;
  basisKind?: SavingsRule["basis"];
  status: "proposed" | "allocated" | "transferred" | "skipped" | "needs_recalculation";
  previousStatus?: "allocated" | "transferred" | "skipped";
  transactionId?: string;
  manuallyAdjusted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavingsHistoryFilters = {
  month?: string;
  ruleId?: string;
  status?: "saved" | "proposed" | "needs_recalculation" | "skipped";
  destination?: "allocation" | "transfer";
};

export function filterSavingsHistory(items: SavingsAllocation[], filters: SavingsHistoryFilters) {
  return items.filter((item) =>
    (!filters.month || item.date.startsWith(filters.month)) &&
    (!filters.ruleId || item.ruleId === filters.ruleId) &&
    (!filters.destination || item.destination.kind === filters.destination) &&
    (!filters.status || (filters.status === "saved"
      ? isSavedSavingsResult(item) : item.status === filters.status)));
}

export function savingsResultId(ruleId: string, date: string) {
  return `saving:${ruleId}:${date}`;
}

export function getSavingsIncome(ledger: AccountLedgerData, rule: SavingsRule, date: string) {
  const relevant = ledger.transactions.filter((item) => item.date === date &&
    item.accountId === rule.sourceAccountId &&
    ["manual", "photo_finance", "spending_jar"].includes(item.source ?? "") &&
    ((item.type === "income" && !isExpenseReversal(item)) ||
      (rule.basis === "net_work" && item.type === "expense" && item.isWorkExpense === true)));
  const income = relevant.filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const workCosts = relevant.filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const signature = relevant.map((item) => `${item.id}:${item.updatedAt}:${item.amount}:${item.type}:${item.isWorkExpense ?? false}`)
    .sort().join("|");
  return { income, workCosts, base: Math.max(0, income - workCosts), signature };
}

export const SAVINGS_ROUNDING_UNIT = 1_000;

/** Round proposed/confirmed savings to whole thousands of đồng. */
export function roundSavingsAmount(amount: number) {
  return Math.round(amount / SAVINGS_ROUNDING_UNIT) * SAVINGS_ROUNDING_UNIT;
}

export function calculateSavingsAmount(rule: SavingsRule, base: number, sampledValue?: number) {
  if (base <= 0) return 0;
  const value = sampledValue ?? rule.value;
  const raw = rule.mode === "percentage" || rule.mode === "random_percentage"
    ? base * value / 100 : value;
  const cap = rule.dailyCap === undefined ? Infinity
    : Math.floor(rule.dailyCap / SAVINGS_ROUNDING_UNIT) * SAVINGS_ROUNDING_UNIT;
  return Math.max(0, Math.min(roundSavingsAmount(raw), cap));
}

export function getSavingsReserved(ledger: Pick<AccountLedgerData, "savingsAllocations">, accountId?: string) {
  return (ledger.savingsAllocations ?? []).filter((item) =>
    (item.status === "allocated" || (item.status === "needs_recalculation" && item.previousStatus === "allocated")) &&
    (!accountId || item.sourceAccountId === accountId))
    .reduce((sum, item) => sum + item.amount, 0);
}

/** Savings reserves do not change account balances; all availability comes from Financial Core. */
export function getSavingsAvailable(ledger: AccountLedgerData, accountId: string) {
  const account = ledger.accounts.find((item) => item.id === accountId && !item.archivedAt);
  if (!account) return 0;
  const position = getFinancialPosition(ledger).accounts.find((item) => item.accountId === accountId);
  const balance = calculateAccountBalance(account, ledger.transactions);
  const liquid = balance - calculateAccountExternalAmount(account);
  return Math.max(0, Math.min(position?.unallocated ?? 0, liquid));
}

export function assertSavingsCoverageAfterLedgerChange(before: AccountLedgerData, after: AccountLedgerData) {
  for (const account of after.accounts) {
    const beforeShortfall = Math.max(0, -getSavingsAvailableRaw(before, account.id));
    const afterShortfall = Math.max(0, -getSavingsAvailableRaw(after, account.id));
    if (afterShortfall > beforeShortfall)
      throw new Error(`Tài khoản ${account.name} không đủ tiền sau khi dành cho tiết kiệm.`);
  }
}

function getSavingsAvailableRaw(ledger: AccountLedgerData, accountId: string) {
  const position = getFinancialPosition(ledger).accounts.find((item) => item.accountId === accountId);
  return position?.unallocated ?? 0;
}
