import { ArrowRight, CalendarRange, TrendingDown,
  TrendingUp } from "lucide-react";
import { DataCompletionCard } from "../features/money-diary/components/dashboard/DataCompletionCard";
import { FinancialDashboard } from "../features/money-diary/components/dashboard/FinancialDashboard";
import { GreetingHeader } from "../features/money-diary/components/dashboard/GreetingHeader";
import { MainGoalCard } from "../features/money-diary/components/dashboard/MainGoalCard";
import { RecentTransactions } from "../features/money-diary/components/dashboard/RecentTransactions";
import { buildDashboardJarFlow, buildManagerOverview } from "../features/money-diary/utils/managerDashboardSelectors";
import { useMemo } from "react";
import type { AccountTransaction } from "../features/account-ledger/accountLedgerModel";
import type { JarActivity } from "../features/spending-jars/domain/jarModel.ts";
import { getFinancialPosition } from "../features/spending-jars/domain/financialPosition.ts";
import type { MainGoalProgressSummary } from "../features/goals/domain/mainGoalProgress";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  GoalScreen,
  Page,
} from "../types";
import type { DataWarning } from "../utils/dataWarnings";
import { formatMoney } from "../utils/money";
import "./HomePage.css";

type HomePageProps = {
  legacyMoneyToolsVisible: boolean;
  actualMoney: number;
  spendableMoney: number;
  financialPosition: ReturnType<typeof getFinancialPosition>;
  jarActivities: JarActivity[];
  balanceChecks: BalanceCheckEntry[];
  cloudLoadError: string | null;
  dataWarnings: DataWarning[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goToNextDay: () => void;
  goToPreviousDay: () => void;
  goToToday: () => void;
  handleSelectDate: (value: string) => void;
  isCloudLoading: boolean;
  isSelectedToday: boolean;
  mainGoal: MainGoalProgressSummary;
  mainGoalName: string;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  onDataWarningAction: (warning: DataWarning) => void;
  onOpenJournal: () => void;
  onOpenSelectedBalanceEditor: () => void;
  openCloseDay: (date?: string) => void;
  retryCloudLoad: () => void;
  selectedBalanceCheck?: BalanceCheckEntry;
  selectedDate: string;
  selectedEntry?: DailyEntry;
  selectedExpense?: ExpenseEntry;
  transactions: AccountTransaction[];
  todayString: string;
};

export function HomePage({
  legacyMoneyToolsVisible,
  actualMoney,
  spendableMoney,
  financialPosition,
  jarActivities,
  balanceChecks,
  cloudLoadError,
  dataWarnings,
  entries,
  expenses,
  goToNextDay,
  goToPreviousDay,
  goToToday,
  handleSelectDate,
  isCloudLoading,
  isSelectedToday,
  mainGoal,
  mainGoalName,
  navigateTo,
  onDataWarningAction,
  onOpenJournal,
  onOpenSelectedBalanceEditor,
  openCloseDay,
  retryCloudLoad,
  selectedBalanceCheck,
  selectedDate,
  selectedEntry,
  selectedExpense,
  transactions,
  todayString,
}: HomePageProps) {
  const { day, month } = useMemo(() => buildManagerOverview(entries, expenses, selectedDate, transactions),
    [entries, expenses, selectedDate, transactions]);
  const jarFlow = useMemo(() => buildDashboardJarFlow(day, transactions, jarActivities),
    [day, transactions, jarActivities]);
  const openHistory = () => navigateTo("history");
  const openGoal = () => navigateTo("goals", "current");
  const requestNotificationPermission = () => navigateTo("settings");

  return (
    <div className="money-overview-page money-manager-overview">
      <GreetingHeader
        isSelectedToday={isSelectedToday}
        onDateChange={handleSelectDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        onToday={goToToday}
        selectedDate={selectedDate}
        today={todayString}
      />

      <FinancialDashboard
        actualMoney={actualMoney}
        day={day}
        flow={jarFlow}
        financialPosition={financialPosition}
        onOpenAccounts={() => navigateTo("accounts")}
        onOpenJars={() => navigateTo("spendingJars")}
        onOpenJournal={onOpenJournal}
        spendableMoney={spendableMoney}
      />

      <MainGoalCard name={mainGoalName} onOpenGoals={openGoal} summary={mainGoal} />

      <section className="money-card manager-month-card" aria-labelledby="manager-month-title">
          <div className="manager-card-title"><span><CalendarRange size={17} /> Tháng đang xem</span>
            <strong id="manager-month-title">{month.net >= 0 ? "+" : "−"}{formatMoney(Math.abs(month.net))}</strong></div>
          <div className="manager-month-flow">
            <div><TrendingUp aria-hidden="true" size={18} /><span>Thu nhập</span><strong>{formatMoney(month.income)}</strong></div>
            <div><TrendingDown aria-hidden="true" size={18} /><span>Chi tiêu</span><strong>{formatMoney(month.expense)}</strong></div>
          </div>
          <div className="manager-month-insight">
            <span>{month.savingsRate === null ? "Chưa có thu nhập để tính tỷ lệ giữ lại" : `Tỷ lệ giữ lại ${month.savingsRate}%`}</span>
            <span>{month.topExpense ? `Chi nhiều nhất: ${month.topExpense.label} · ${formatMoney(month.topExpense.amount)}` : "Chưa có khoản chi trong tháng"}</span>
          </div>
          <button className="money-text-action" onClick={() => navigateTo("analytics")} type="button">Xem thống kê <ArrowRight size={16} /></button>
      </section>

      {legacyMoneyToolsVisible && <DataCompletionCard
        balanceCheck={selectedBalanceCheck}
        entry={selectedEntry}
        error={cloudLoadError}
        expense={selectedExpense}
        isLoading={isCloudLoading}
        isSelectedToday={isSelectedToday}
        onAddExpense={() => openCloseDay(selectedDate)}
        onAddIncome={() => openCloseDay(selectedDate)}
        onCheckBalance={onOpenSelectedBalanceEditor}
        onEnableNotifications={requestNotificationPermission}
        onOpenHistory={openHistory}
        onRetry={retryCloudLoad}
        onWarningAction={onDataWarningAction}
        selectedDate={selectedDate}
        warnings={dataWarnings}
      />}

      <RecentTransactions entries={entries} expenses={expenses} accountTransactions={transactions} onViewAll={openHistory} />

      {balanceChecks.length === 0 && <p className="manager-overview-footnote">
        Kiểm kê số dư định kỳ giúp con số “Tổng tiền hiện có” đáng tin cậy hơn.
      </p>}
    </div>
  );
}
