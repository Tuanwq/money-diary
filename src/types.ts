export type Mood = "good" | "normal" | "tired" | "bad";

export type DailyEntry = {
  id: string;
  date: string;
  diary: string;
  income: number;
  receivedMoney: number;
  bonusMoney: number;
  orderCount: number;
  workHours: number;
  mood: Mood;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

export type ExpenseEntry = {
  id: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  other: number;
  otherLabel?: string;
  otherItems?: OtherExpenseItem[];
  note: string;
  createdAt: string;
  updatedAt?: string;
};

export type OtherExpenseItem = {
  id: string;
  label: string;
  amount: number;
};

export type ExpenseBudget = {
  id: string;
  label: string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt?: string;
};

export type BalanceCheckEntry = {
  id: string;
  date: string;
  cash: number;
  bank: number;
  appMoney: number;
  actualMoney: number;
  difference: number;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

export type Goals = {
  dailyIncome: number;
  dailyHours: number;
  weeklyIncome: number;
  weeklyHours: number;
  monthlyIncome: number;
  monthlyHours: number;

  bigGoalName: string;
  bigGoalTarget: number;
  bigGoalSaved: number;
  bigGoalDeadline: string;
  bigGoalStartDate: string;

  subGoals: SubGoal[];
  expenseBudgets?: ExpenseBudget[];
};

export type Page =
  | "home"
  | "goals"
  | "entry"
  | "closeDay"
  | "history"
  | "expenses"
  | "balanceChecks"
  | "changes"
  | "hub"
  | "settings";

export type GoalScreen =
  | "menu"
  | "current"
  | "subGoals"
  | "milestones"
  | "balance"
  | "completed"
  | "completedDetail";

export type AppHistoryState = {
  goalId?: string;
  page: Page;
  goalScreen: GoalScreen;
  scrollTop?: number;
};

export type CompletedGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  completedAt: string;
  startDate?: string;

  goalType?: "main" | "sub";

  totalIncome?: number;
  totalExpense?: number;
  actualMoney?: number;
  totalJourneyMoney?: number;
  totalHours?: number;
  totalOrders?: number;

  entriesSnapshot?: DailyEntry[];
  expensesSnapshot?: ExpenseEntry[];
  balanceSnapshots?: BalanceSnapshot[];
  balanceChecksSnapshot?: BalanceCheckEntry[];

  contributionsSnapshot?: GoalContribution[];
  goalProgressSnapshots?: GoalProgressSnapshot[];
};

export type BalanceSnapshot = {
  date: string;
  totalMoney: number;
  actualMoney: number;
  income: number;
  expense: number;
};

export type GoalContribution = {
  id: string;
  date: string;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

export type SubGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  startDate: string;
  contributions: GoalContribution[];
  createdAt: string;
  updatedAt?: string;
};

export type GoalProgressSnapshot = {
  date: string;
  saved: number;
  contributed: number;
  progress: number;
};

export type SyncableDatedItem = {
  date: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AppDataKey =
  | "entries"
  | "expenses"
  | "balanceChecks"
  | "goals"
  | "completedGoals";

export type AppChangeAction =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "restore";

export type AppChangePatch = {
  key: AppDataKey;
  before: unknown;
  after: unknown;
  beforeSummary: string;
  afterSummary: string;
};

export type AppChangeLog = {
  id: string;
  action: AppChangeAction;
  title: string;
  description: string;
  date?: string;
  patches: AppChangePatch[];
  originalChangeId?: string;
  restoredAt?: string;
  createdAt: string;
};
