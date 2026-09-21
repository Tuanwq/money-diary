import { ArrowLeft, ArrowRight, CalendarRange, Camera, TrendingDown,
  TrendingUp, WalletCards } from "lucide-react";
import { DataCompletionCard } from "../features/money-diary/components/dashboard/DataCompletionCard";
import { GreetingHeader } from "../features/money-diary/components/dashboard/GreetingHeader";
import { MainGoalCard } from "../features/money-diary/components/dashboard/MainGoalCard";
import { RecentTransactions } from "../features/money-diary/components/dashboard/RecentTransactions";
import { buildManagerMonthlyOverview } from "../features/money-diary/utils/managerDashboardSelectors";
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
  actualMoney: number;
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
  selectedExpenseTotal: number;
  selectedGrossIncome: number;
  todayString: string;
};

export function HomePage({
  actualMoney,
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
  selectedExpenseTotal,
  selectedGrossIncome,
  todayString,
}: HomePageProps) {
  const month = buildManagerMonthlyOverview(entries, expenses, selectedDate);
  const dayNet = selectedGrossIncome - selectedExpenseTotal;
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

      <section className="manager-balance-card" aria-labelledby="manager-balance-title">
        <div className="manager-balance-heading">
          <span><WalletCards aria-hidden="true" size={17} /> Tổng tiền hiện có</span>
          <button type="button" onClick={() => navigateTo("accounts")}>Xem tài khoản <ArrowRight size={16} /></button>
        </div>
        <strong id="manager-balance-title">{formatMoney(actualMoney)}</strong>
        <p>Tổng số dư hiện tại trong Sổ tài khoản. Tiến độ hành trình được theo dõi riêng ở mục tiêu bên dưới.</p>

        <div className="manager-day-strip" aria-label="Biến động ngày đang xem">
          <div><span>Thu trong ngày</span><strong className="is-positive">+{formatMoney(selectedGrossIncome)}</strong></div>
          <div><span>Chi trong ngày</span><strong className="is-negative">−{formatMoney(selectedExpenseTotal)}</strong></div>
          <div><span>Thay đổi ròng</span><strong className={dayNet < 0 ? "is-negative" : "is-positive"}>
            {dayNet >= 0 ? "+" : "−"}{formatMoney(Math.abs(dayNet))}
          </strong></div>
        </div>

        <button className="manager-journal-entry" onClick={onOpenJournal} type="button">
          <span><Camera aria-hidden="true" size={20} /><span><strong>Mở Nhật ký tài chính</strong>
            <small>Chụp ảnh và lưu câu chuyện của khoản tiền</small></span></span>
          <span className="manager-journal-swipe"><ArrowLeft size={15} /> Vuốt sang trái</span>
        </button>
      </section>

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

      <DataCompletionCard
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
      />

      <RecentTransactions entries={entries} expenses={expenses} onViewAll={openHistory} />

      {balanceChecks.length === 0 && <p className="manager-overview-footnote">
        Kiểm kê số dư định kỳ giúp con số “Tổng tiền hiện có” đáng tin cậy hơn.
      </p>}
    </div>
  );
}
