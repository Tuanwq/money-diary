import {
  calculateAccountBalance,
  type AccountTransaction,
  type FinancialAccount,
} from "../../account-ledger/accountLedgerModel.ts";

export type FinancialDateRange = { fromDate: string; toDate: string };

/** Dates in the ledger are local YYYY-MM-DD dates. Never round-trip them through UTC. */
export function selectFinancialTransactions(
  transactions: AccountTransaction[],
  range?: FinancialDateRange,
) {
  return transactions.filter((item) => !range ||
    (item.date >= range.fromDate && item.date <= range.toDate));
}

export function summarizeFinancialTransactions(
  transactions: AccountTransaction[],
  range?: FinancialDateRange,
) {
  return selectFinancialTransactions(transactions, range).reduce(
    (total, item) => {
      if (item.type === "income") total.income += item.amount;
      if (item.type === "expense") total.expense += item.amount;
      if (item.type === "transfer") total.transfer += item.amount;
      total.net = total.income - total.expense;
      return total;
    },
    { income: 0, expense: 0, transfer: 0, net: 0 },
  );
}

export function groupFinancialTransactionsByDay(
  transactions: AccountTransaction[],
  range?: FinancialDateRange,
) {
  const days = new Map<string, ReturnType<typeof summarizeFinancialTransactions>>();
  for (const item of selectFinancialTransactions(transactions, range)) {
    const day = days.get(item.date) ?? { income: 0, expense: 0, transfer: 0, net: 0 };
    if (item.type === "income") day.income += item.amount;
    if (item.type === "expense") day.expense += item.amount;
    if (item.type === "transfer") day.transfer += item.amount;
    day.net = day.income - day.expense;
    days.set(item.date, day);
  }
  return days;
}

export function groupFinancialExpensesByCategory(
  transactions: AccountTransaction[],
  range?: FinancialDateRange,
) {
  const categories = new Map<string, number>();
  for (const item of selectFinancialTransactions(transactions, range)) {
    if (item.type !== "expense") continue;
    const name = item.category.trim() || "Khác chưa gắn nhãn";
    categories.set(name, (categories.get(name) ?? 0) + item.amount);
  }
  return [...categories].map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

export function getFinancialAccountBalances(
  accounts: FinancialAccount[],
  transactions: AccountTransaction[],
) {
  return accounts.filter((account) => !account.archivedAt).map((account) => ({
    account,
    balance: calculateAccountBalance(account, transactions),
  }));
}
