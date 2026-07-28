import {
  STORAGE_APP_CHANGE_LOGS_KEY,
  STORAGE_OTHER_EXPENSE_LABELS_KEY,
} from "../../constants";
import {
  DEFAULT_HUB_SETTINGS,
  STORAGE_HUB_CALCULATOR_KEY,
  STORAGE_HUB_CHANGE_LOGS_KEY,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "../../constants/hanoiHub";
import type {
  AppChangeLog,
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../../types";
import type {
  HubChangeLog,
  HubEntry,
  HubSettings,
} from "../../types/hub";
import type { BackupSourceData } from "./backupModel";
import type {
  AccountTransaction,
  FinancialAccount,
} from "../account-ledger/accountLedgerModel";
import type { AccountReconciliation } from "../account-reconciliation/accountReconciliationModel";
import type {
  AutomationRule,
  AutomationRunLog,
} from "../automation/automationModel";
import type { CashFlowPlan } from "../cash-flow/cashFlowForecastModel";

export type MoneyBackupState = {
  accountTransactions: AccountTransaction[];
  accountReconciliations: AccountReconciliation[];
  appChangeLogs: AppChangeLog[];
  automationLogs: AutomationRunLog[];
  automationProcessedKeys: string[];
  automationRules: AutomationRule[];
  balanceChecks: BalanceCheckEntry[];
  cashFlowPlans: CashFlowPlan[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  financialAccounts: FinancialAccount[];
  goals: Goals;
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function buildBackupSourceData(
  moneyState: MoneyBackupState
): BackupSourceData {
  const hubSettings: HubSettings = {
    ...DEFAULT_HUB_SETTINGS,
    ...loadJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {}),
  };

  return {
    accounts: {
      accounts: moneyState.financialAccounts,
      reconciliations: moneyState.accountReconciliations,
      transactions: moneyState.accountTransactions,
    },
    automation: {
      logs: moneyState.automationLogs,
      processedKeys: moneyState.automationProcessedKeys,
      rules: moneyState.automationRules,
    },
    cashFlow: {
      plans: moneyState.cashFlowPlans,
    },
    journal: {
      appChangeLogs:
        moneyState.appChangeLogs.length > 0
          ? moneyState.appChangeLogs
          : loadJson<AppChangeLog[]>(STORAGE_APP_CHANGE_LOGS_KEY, []),
      balanceChecks: moneyState.balanceChecks,
      entries: moneyState.entries,
      expenses: moneyState.expenses,
      otherExpenseLabels: loadJson<string[]>(
        STORAGE_OTHER_EXPENSE_LABELS_KEY,
        []
      ),
    },
    goals: {
      completedGoals: moneyState.completedGoals,
      goals: moneyState.goals,
    },
    hub: {
      calculator: loadJson<Record<string, unknown>>(
        STORAGE_HUB_CALCULATOR_KEY,
        {}
      ),
      changeLogs: loadJson<HubChangeLog[]>(
        STORAGE_HUB_CHANGE_LOGS_KEY,
        []
      ),
      entries: loadJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, []),
      settings: hubSettings,
    },
  };
}
