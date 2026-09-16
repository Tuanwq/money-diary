import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";
import type { AiFinanceInsightProps } from "../components/AiFinanceInsight";
import type { AccountTransaction, FinancialAccount } from "../features/account-ledger/accountLedgerModel.ts";
import { HUB_INITIAL_TAB_SESSION_KEY } from "../constants/hanoiHub";
import type {
  CashFlowGoalCommitment,
  CashFlowPlan,
} from "../features/cash-flow/cashFlowForecastModel";
import { BalanceCheckSummaryCard } from "../features/money-diary/components/dashboard/BalanceCheckSummaryCard";
import { DataCompletionCard } from "../features/money-diary/components/dashboard/DataCompletionCard";
import { GoalJourney } from "../features/money-diary/components/dashboard/GoalJourney";
import { GreetingHeader } from "../features/money-diary/components/dashboard/GreetingHeader";
import { IncomeProgressSection } from "../features/money-diary/components/dashboard/IncomeProgressSection";
import { MainGoalCard } from "../features/money-diary/components/dashboard/MainGoalCard";
import { NextSuggestionCard } from "../features/money-diary/components/dashboard/NextSuggestionCard";
import { QuickActions } from "../features/money-diary/components/dashboard/QuickActions";
import { RecentTransactions } from "../features/money-diary/components/dashboard/RecentTransactions";
import { TodayTargetCard } from "../features/money-diary/components/dashboard/TodayTargetCard";
import { MoneyStreakCard } from "../features/money-diary/streak/MoneyStreakCard";
import { useMoneyStreak } from "../features/money-diary/streak/useMoneyStreak";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  GoalScreen,
  Goals,
  Page,
} from "../types";
import type { DataWarning } from "../utils/dataWarnings";
import { getProgress } from "../utils/goals";

const LazyAiFinanceInsight = lazy(() =>
  import("../components/AiFinanceInsight").then((module) => ({
    default: module.AiFinanceInsight,
  }))
);
const LazyPhotoFinanceExperience = lazy(() =>
  import("../features/photo-finance/components/PhotoFinanceExperience.tsx")
    .then((module) => ({ default: module.PhotoFinanceExperience }))
);

function DeferredAiFinanceInsight(props: AiFinanceInsightProps) {
  const [shouldMount, setShouldMount] = useState(
    () => sessionStorage.getItem("money-diary:open-ai-pending") === "1"
  );

  useEffect(() => {
    if (shouldMount) {
      sessionStorage.removeItem("money-diary:open-ai-pending");
    }

    function handleOpenAi() {
      sessionStorage.removeItem("money-diary:open-ai-pending");
      setShouldMount(true);
    }

    window.addEventListener("money-diary:open-ai", handleOpenAi);
    return () =>
      window.removeEventListener("money-diary:open-ai", handleOpenAi);
  }, [shouldMount]);

  if (!shouldMount) return null;

  return (
    <Suspense fallback={null}>
      <LazyAiFinanceInsight {...props} initialOpen />
    </Suspense>
  );
}

type HomePageProps = {
  financialAccounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  photoOwnerId?: string;
  onDeleteAccountTransaction: (transactionId: string) => void;
  onSaveAccountTransaction: (transaction: AccountTransaction) => void;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  cashFlowCurrentBalance: number;
  cashFlowGoalCommitments: CashFlowGoalCommitment[];
  cashFlowPlans: CashFlowPlan[];
  cloudLoadError: string | null;
  isCloudLoading: boolean;
  isSelectedToday: boolean;
  selectedDate: string;
  goals: Goals;
  daysLeft: number;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  handleSelectDate: (value: string) => void;
  todayString: string;
  todayGoalPaceRemaining: number;
  needPerDay: number;
  todayActualIncome: number;
  todayDailyIncomeRemaining: number;
  todayWorkActualIncome: number;
  todayEntry?: DailyEntry;
  todayExpense?: ExpenseEntry;
  todayBalanceCheck?: BalanceCheckEntry;
  todayExpenseTotal: number;
  dataWarnings: DataWarning[];
  goToTodayEntryForm: () => void;
  goToTodayBalanceCheck: () => void;
  openCloseDay: (date?: string) => void;
  onDataWarningAction: (warning: DataWarning) => void;
  selectedActualIncome: number;
  selectedEntry?: DailyEntry;
  selectedExpense?: ExpenseEntry;
  selectedBalanceCheck?: BalanceCheckEntry;
  selectedAppMoney: number;
  selectedMainIncome: number;
  selectedBonusMoney: number;
  selectedExpenseTotal: number;
  selectedReceivedMoney: number;
  selectedHours: number;
  weekIncome: number;
  monthIncome: number;
  actualMoney: number;
  totalJourneyMoney: number;
  onOpenSelectedBalanceDetails: () => void;
  onOpenSelectedBalanceEditor: () => void;
  retryCloudLoad: () => void;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function HomePage({
  financialAccounts,
  accountTransactions,
  photoOwnerId,
  onDeleteAccountTransaction,
  onSaveAccountTransaction,
  entries,
  expenses,
  balanceChecks,
  cashFlowCurrentBalance,
  cashFlowGoalCommitments,
  cashFlowPlans,
  cloudLoadError,
  isCloudLoading,
  isSelectedToday,
  selectedDate,
  goals,
  daysLeft,
  goToPreviousDay,
  goToNextDay,
  goToToday,
  handleSelectDate,
  todayString,
  todayGoalPaceRemaining,
  needPerDay,
  todayActualIncome,
  dataWarnings,
  goToTodayEntryForm,
  goToTodayBalanceCheck,
  openCloseDay,
  onDataWarningAction,
  selectedActualIncome,
  selectedEntry,
  selectedExpense,
  selectedBalanceCheck,
  selectedAppMoney,
  selectedMainIncome,
  selectedBonusMoney,
  selectedExpenseTotal,
  selectedReceivedMoney,
  selectedHours,
  weekIncome,
  monthIncome,
  actualMoney,
  totalJourneyMoney,
  onOpenSelectedBalanceDetails,
  onOpenSelectedBalanceEditor,
  retryCloudLoad,
  navigateTo,
}: HomePageProps) {
  const moneyStreak = useMoneyStreak();
  const mainGoalProgress = getProgress(actualMoney, goals.bigGoalTarget);
  const mainGoalRemaining = Math.max(goals.bigGoalTarget - actualMoney, 0);
  const hasSuggestionData = Boolean(
    goals.bigGoalTarget > 0 &&
      (entries.some((entry) => entry.date <= selectedDate) ||
        expenses.some((expense) => expense.date <= selectedDate))
  );

  const openIncome = () => navigateTo("hub");
  const openHistory = () => navigateTo("history");
  const openGoal = () => navigateTo("goals", "current");
  const openStreakCalendar = () => {
    sessionStorage.setItem(HUB_INITIAL_TAB_SESSION_KEY, "list");
    navigateTo("hub");
  };

  function requestNotificationPermission() {
    navigateTo("settings");
  }

  function navigateFromFinanceInsight(page: Page, date?: string) {
    if (page === "closeDay") {
      openCloseDay(date);
      return;
    }

    if (date) handleSelectDate(date);
    navigateTo(page);
  }

  return (
    <div className="money-overview-page">
      <GreetingHeader
        isSelectedToday={isSelectedToday}
        onDateChange={handleSelectDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        onToday={goToToday}
        selectedDate={selectedDate}
        today={todayString}
      />
      <Suspense fallback={<div className="app-card rounded-2xl p-4">Đang mở lịch tài chính...</div>}>
        <LazyPhotoFinanceExperience accounts={financialAccounts} entries={entries}
          expenses={expenses} ownerId={photoOwnerId}
          onDeleteTransaction={onDeleteAccountTransaction}
          onSaveTransaction={onSaveAccountTransaction}
          transactions={accountTransactions} />
      </Suspense>

      <MoneyStreakCard
        isCloudLoading={moneyStreak.isCloudLoading}
        isRestoring={moneyStreak.isRestoring}
        restoreError={moneyStreak.restoreError}
        summary={moneyStreak.summary}
        onOpenCalendar={openStreakCalendar}
        onRestore={moneyStreak.restoreDate}
      />

      <IncomeProgressSection
        actualMoney={actualMoney}
        error={cloudLoadError}
        goals={goals}
        isLoading={isCloudLoading}
        isSelectedToday={isSelectedToday}
        monthIncome={monthIncome}
        selectedActualIncome={selectedActualIncome}
        selectedBonusMoney={selectedBonusMoney}
        selectedEntry={selectedEntry}
        selectedExpenseTotal={selectedExpenseTotal}
        selectedHours={selectedHours}
        selectedMainIncome={selectedMainIncome}
        selectedReceivedMoney={selectedReceivedMoney}
        totalJourneyMoney={totalJourneyMoney}
        onRetry={retryCloudLoad}
        weekIncome={weekIncome}
      />

      <div className="money-overview-primary-grid">
        <MainGoalCard
          daysLeft={daysLeft}
          error={cloudLoadError}
          goals={goals}
          isLoading={isCloudLoading}
          name={goals.bigGoalName}
          onOpenGoals={openGoal}
          onRetry={retryCloudLoad}
          onViewDetails={openGoal}
          progress={mainGoalProgress}
          remaining={mainGoalRemaining}
          saved={actualMoney}
          selectedDate={selectedDate}
          target={goals.bigGoalTarget}
        />
        <div className="money-overview-today-column">
          <TodayTargetCard
            earned={todayActualIncome}
            needed={todayGoalPaceRemaining}
            onAction={todayGoalPaceRemaining > 0 ? openIncome : openHistory}
            target={needPerDay}
          />
          <DataCompletionCard
            balanceCheck={selectedBalanceCheck}
            entry={selectedEntry}
            error={cloudLoadError}
            expense={selectedExpense}
            isLoading={isCloudLoading}
            isSelectedToday={isSelectedToday}
            onAddExpense={openCloseDay}
            onAddIncome={openCloseDay}
            onCheckBalance={onOpenSelectedBalanceEditor}
            onEnableNotifications={requestNotificationPermission}
            onOpenHistory={openHistory}
            onRetry={retryCloudLoad}
            onWarningAction={onDataWarningAction}
            selectedDate={selectedDate}
            warnings={dataWarnings}
          />
        </div>
      </div>

      <GoalJourney progress={mainGoalProgress} />

      <div className="money-overview-decision-grid">
        <BalanceCheckSummaryCard
          balanceCheck={selectedBalanceCheck}
          isLoading={isCloudLoading}
          isSelectedToday={isSelectedToday}
          onOpenDetails={onOpenSelectedBalanceDetails}
          onOpenEditor={onOpenSelectedBalanceEditor}
          selectedDate={selectedDate}
        />

        <NextSuggestionCard
          actualMoney={selectedAppMoney}
          balanceChecks={balanceChecks}
          entries={entries}
          expenses={expenses}
          goals={goals}
          isDataComplete={hasSuggestionData}
          isLoading={isCloudLoading}
          navigateToGoals={openGoal}
          navigateToHub={openIncome}
          today={selectedDate}
        />
      </div>

      <RecentTransactions
        entries={entries}
        expenses={expenses}
        onViewAll={openHistory}
      />

      <QuickActions
        onBalance={goToTodayBalanceCheck}
        onExpense={goToTodayEntryForm}
        onHistory={openHistory}
        onIncome={openIncome}
      />

      <DeferredAiFinanceInsight
        balanceChecks={balanceChecks}
        cashFlowCurrentBalance={cashFlowCurrentBalance}
        cashFlowGoalCommitments={cashFlowGoalCommitments}
        cashFlowPlans={cashFlowPlans}
        entries={entries}
        expenses={expenses}
        goals={goals}
        hideTrigger
        onNavigate={navigateFromFinanceInsight}
        today={todayString}
      />
    </div>
  );
}
