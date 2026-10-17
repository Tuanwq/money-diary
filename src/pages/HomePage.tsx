import { ArrowLeft, ArrowRight, CalendarRange, Camera, TrendingDown,
  TrendingUp, WalletCards, CookingPot } from "lucide-react";
import { DataCompletionCard } from "../features/money-diary/components/dashboard/DataCompletionCard";
import { GreetingHeader } from "../features/money-diary/components/dashboard/GreetingHeader";
import { MainGoalCard } from "../features/money-diary/components/dashboard/MainGoalCard";
import { RecentTransactions } from "../features/money-diary/components/dashboard/RecentTransactions";
import { buildManagerOverview } from "../features/money-diary/utils/managerDashboardSelectors";
import { useMemo } from "react";
import type { AccountTransaction } from "../features/account-ledger/accountLedgerModel";
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
  actualMoney: number;
  spendableMoney: number;
  financialPosition: ReturnType<typeof getFinancialPosition>;
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
  actualMoney,
  spendableMoney,
  financialPosition,
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
          <span><WalletCards aria-hidden="true" size={17} /> Tổng tiền hiện có (có thể dùng ngay)</span>
          <button type="button" onClick={() => navigateTo("accounts")}>Xem tài khoản <ArrowRight size={16} /></button>
        </div>
        <strong id="manager-balance-title">{formatMoney(spendableMoney)}</strong>
        <p>Trên tổng số dư {formatMoney(actualMoney)} trong Sổ tài khoản.</p>

        <div className="manager-day-strip" aria-label="Biến động ngày đang xem">
          <div><span>Thu trong ngày</span><strong className="is-positive">+{formatMoney(day.income)}</strong></div>
          <div><span>Chi ròng trong ngày</span><strong className={day.expense < 0 ? "is-positive" : "is-negative"}>
            {day.expense < 0 ? "+" : "−"}{formatMoney(Math.abs(day.expense))}</strong></div>
          <div><span>Thay đổi ròng</span><strong className={day.net < 0 ? "is-negative" : "is-positive"}>
            {day.net >= 0 ? "+" : "−"}{formatMoney(Math.abs(day.net))}
          </strong></div>
        </div>

        <button className="manager-journal-entry" onClick={onOpenJournal} type="button">
          <span><Camera aria-hidden="true" size={20} /><span><strong>Mở Nhật ký tài chính</strong>
            <small>Chụp ảnh và lưu câu chuyện của khoản tiền</small></span></span>
          <span className="manager-journal-swipe"><ArrowLeft size={15} /> Vuốt sang trái</span>
        </button>
      </section>

      <section className="money-card manager-allocation-card" aria-label="Tiền trong tài khoản và hũ">
        <div className="manager-card-title"><span><WalletCards size={17} aria-hidden="true" /> Tiền thực có đang được dùng thế nào</span></div>
        <div className="manager-allocation-grid">
          <div><span>Đã dành trong hũ</span><strong>{formatMoney(financialPosition.reserved)}</strong></div>
          <div><span>Chưa dành trong hũ</span><strong>{formatMoney(Math.max(0, spendableMoney - financialPosition.reserved))}</strong></div>
          <div><span>Có thể nạp thêm vào hũ</span><strong>{formatMoney(financialPosition.allocationCapacity)}</strong></div>
        </div>
        <div className="manager-allocation-bar" role="progressbar" aria-label="Tỷ lệ tiền thực có đã dành trong hũ"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={spendableMoney > 0 ? Math.min(100, Math.round(financialPosition.reserved / spendableMoney * 100)) : 0}>
          <span style={{ width: `${spendableMoney > 0 ? Math.min(100, financialPosition.reserved / spendableMoney * 100) : 0}%` }} />
        </div>
        {(financialPosition.shortfall > 0 || financialPosition.needsReview > 0) && <p>
          {financialPosition.shortfall > 0 && `Tiền đã dành vượt tiền thực có ${formatMoney(financialPosition.shortfall)}. `}
          {financialPosition.needsReview > 0 && `${financialPosition.needsReview} tài khoản cần xác nhận quyền dùng cho hũ.`}
        </p>}
        <button className="money-text-action" type="button" onClick={() => navigateTo("spendingJars")}>Xem các hũ <ArrowRight size={16} /></button>
      </section>

      <MainGoalCard name={mainGoalName} onOpenGoals={openGoal} summary={mainGoal} />

      <button className="money-card manager-jars-shortcut" onClick={() => navigateTo("spendingJars")} type="button">
        <CookingPot size={20} aria-hidden="true" /> <span><strong>Hũ chi tiêu</strong><small>Dành tiền cho các khoản sắp chi · vuốt sang phải</small></span><ArrowRight size={18} />
      </button>

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

      <RecentTransactions entries={entries} expenses={expenses} accountTransactions={transactions} onViewAll={openHistory} />

      {balanceChecks.length === 0 && <p className="manager-overview-footnote">
        Kiểm kê số dư định kỳ giúp con số “Tổng tiền hiện có” đáng tin cậy hơn.
      </p>}
    </div>
  );
}
