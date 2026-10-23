export const ACCOUNT_LEDGER_STORAGE_KEY = "money_diary_account_ledger";

export type FinancialAccountType =
  | "cash"
  | "bank"
  | "e_wallet"
  | "other";

/** Existing accounts remain review-only until their owner chooses explicitly. */
export type BudgetEligibility = "eligible" | "excluded" | "needs_review";

export type AccountTransactionType = "income" | "expense" | "transfer" | "debt";

export type TransactionPurpose =
  | "income"
  | "daily_expense"
  | "goal_allocation"
  | "internal_transfer"
  | "debt_principal";

export type FinancialAccount = {
  archivedAt?: string;
  createdAt: string;
  id: string;
  name: string;
  openingBalance: number;
  type: FinancialAccountType;
  budgetEligibility?: BudgetEligibility;
  updatedAt: string;
  /** Availability annotations; account balance is still derived only from transactions. */
  externalEntries?: import("./accountExternalModel.ts").AccountExternalEntry[];
};

export type AccountTransaction = {
  accountId: string;
  amount: number;
  category: string;
  /** Stable link; category remains a display snapshot for older clients and reports. */
  categoryId?: string;
  createdAt: string;
  date: string;
  id: string;
  note: string;
  /** Explicit purpose used by goal calculations. Missing legacy values are left unclassified. */
  purpose?: TransactionPurpose;
  toAccountId?: string;
  /** Debt movements are cash movements, never earned income or spending. */
  debtDirection?: "in" | "out";
  debtId?: string;
  debtPaymentId?: string;
  type: AccountTransactionType;
  updatedAt: string;
  /** Photo Finance owns this transaction; legacy diary amounts are never written for it. */
  source?: "photo_finance" | "spending_jar" | "manual" | "debt" | "savings";
  /** A jar expense/refund belongs to one activity; several rows may share its activity ID. */
  jarId?: string;
  jarActivityId?: string;
  /** Money returned from a prior expense; increases balance but is not earned income. */
  reversesExpense?: boolean;
  /** Explicit work cost for net-income savings rules; categories are never inferred. */
  isWorkExpense?: boolean;
  occurredAt?: string;
};

export function isExpenseReversal(transaction: AccountTransaction): boolean {
  return transaction.type === "income" && transaction.source === "spending_jar" &&
    (transaction.reversesExpense === true || transaction.id.startsWith("jar-refund:"));
}

/** Savings transfers remain in the ledger for balance accounting, but have their own history. */
export function isSavingsTransfer(transaction: AccountTransaction): boolean {
  return transaction.source === "savings" || transaction.id.startsWith("saving-transfer:");
}

export type AccountLedgerData = {
  accounts: FinancialAccount[];
  transactions: AccountTransaction[];
  jars: import("../spending-jars/domain/jarModel.ts").SpendingJar[];
  jarActivities: import("../spending-jars/domain/jarModel.ts").JarActivity[];
  categories?: TransactionCategory[];
  debts?: import("./debtModel.ts").Debt[];
  savingsRules?: import("../savings/domain/savingsModel.ts").SavingsRule[];
  savingsAllocations?: import("../savings/domain/savingsModel.ts").SavingsAllocation[];
  updatedAt: string;
};

export type TransactionCategory = {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color?: string;
  icon?: string;
  deletedAt?: string;
};

export const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  e_wallet: "Ví điện tử",
  other: "Tài khoản khác",
};

export const TRANSACTION_TYPE_LABELS: Record<
  AccountTransactionType,
  string
> = {
  income: "Thu tiền",
  expense: "Chi tiền",
  transfer: "Chuyển tiền",
  debt: "Công nợ",
};

export const TRANSACTION_PURPOSE_LABELS: Record<TransactionPurpose, string> = {
  income: "Thu nhập tính vào mục tiêu",
  daily_expense: "Chi phí thường ngày",
  goal_allocation: "Phân bổ tiền mục tiêu",
  internal_transfer: "Chuyển nội bộ",
  debt_principal: "Biến động công nợ",
};

export function getDefaultTransactionPurpose(
  type: AccountTransactionType
): TransactionPurpose {
  if (type === "income") return "income";
  if (type === "transfer") return "internal_transfer";
  if (type === "debt") return "debt_principal";
  return "daily_expense";
}

export const TRANSACTION_CATEGORIES = {
  income: ["Thu nhập", "Tiền thưởng", "Tiền nhận", "Hoàn tiền", "Khác"],
  expense: [
    "Ăn uống",
    "Xăng xe",
    "Hóa đơn",
    "Mua sắm",
    "Trả nợ",
    "Khác",
  ],
  transfer: ["Chuyển nội bộ"],
  debt: ["Công nợ"],
} satisfies Record<AccountTransactionType, string[]>;

export function createDefaultAccounts(now = new Date().toISOString()) {
  return [
    {
      createdAt: now,
      id: "money-account-cash",
      name: "Tiền mặt",
      openingBalance: 0,
      type: "cash",
      updatedAt: now,
    },
    {
      createdAt: now,
      id: "money-account-bank",
      name: "Ngân hàng",
      openingBalance: 0,
      type: "bank",
      updatedAt: now,
    },
    {
      createdAt: now,
      id: "money-account-wallet",
      name: "Ví điện tử",
      openingBalance: 0,
      type: "e_wallet",
      updatedAt: now,
    },
    {
      createdAt: now,
      id: "money-account-driver-wallet",
      name: "Ví Driver",
      openingBalance: 0,
      type: "e_wallet",
      updatedAt: now,
    },
  ] satisfies FinancialAccount[];
}

export function createDefaultLedger(): AccountLedgerData {
  const now = new Date().toISOString();

  return {
    accounts: createDefaultAccounts(now),
    transactions: [],
    jars: [],
    jarActivities: [],
    categories: undefined,
    debts: [],
    savingsRules: [],
    savingsAllocations: [],
    updatedAt: now,
  };
}

export function calculateAccountBalance(
  account: FinancialAccount,
  transactions: AccountTransaction[]
) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === "income" && transaction.accountId === account.id) {
      return balance + transaction.amount;
    }

    if (
      transaction.type === "expense" &&
      transaction.accountId === account.id
    ) {
      return balance - transaction.amount;
    }

    if (transaction.type === "transfer") {
      if (transaction.accountId === account.id) {
        return balance - transaction.amount;
      }

      if (transaction.toAccountId === account.id) {
        return balance + transaction.amount;
      }
    }

    if (transaction.type === "debt" && transaction.accountId === account.id) {
      return balance + (transaction.debtDirection === "in" ? transaction.amount : -transaction.amount);
    }

    return balance;
  }, account.openingBalance);
}

export function calculateAccountBalanceAtDate(
  account: FinancialAccount,
  transactions: AccountTransaction[],
  date: string
) {
  return calculateAccountBalance(
    account,
    transactions.filter((transaction) => transaction.date <= date)
  );
}

export function getLedgerSummary(
  accounts: FinancialAccount[],
  transactions: AccountTransaction[],
  monthKey: string
) {
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const monthTransactions = transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey)
  );

  return {
    expense: monthTransactions.reduce((sum, transaction) => sum +
      (transaction.type === "expense" ? transaction.amount :
        isExpenseReversal(transaction) ? -transaction.amount : 0), 0),
    income: monthTransactions
      .filter((transaction) => transaction.type === "income" && !isExpenseReversal(transaction))
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    totalBalance: activeAccounts.reduce(
      (sum, account) => sum + calculateAccountBalance(account, transactions),
      0
    ),
    transfer: monthTransactions
      .filter((transaction) => transaction.type === "transfer" && !isSavingsTransfer(transaction))
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}

export function isAccountLedgerData(value: unknown): value is AccountLedgerData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AccountLedgerData>;

  return (
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.transactions) &&
    typeof candidate.updatedAt === "string"
  );
}
