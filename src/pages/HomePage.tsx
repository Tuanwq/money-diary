import type { RefObject, ReactNode } from "react";
import { DataWarningsPanel } from "../components/DataWarningsPanel";
import { StatCard } from "../components/StatCard";
import { TodayDashboard } from "../components/TodayDashboard";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  GoalScreen,
  Goals,
  Page,
} from "../types";
import { formatDateShort, getDaysLeft } from "../utils/date";
import { formatMoney } from "../utils/money";
import { getProgress, isGoalBehind } from "../utils/goals";
import type { DataWarning } from "../utils/dataWarnings";

type HomePageProps = {
  isSelectedToday: boolean;
  selectedDate: string;
  goals: Goals;
  isBigGoalBehind: boolean;
  daysLeft: number;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  handleSelectDate: (value: string) => void;
  todayString: string;
  todayChecklistDoneCount: number;
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
  openCloseDay: () => void;
  onDataWarningAction: (warning: DataWarning) => void;
  selectedActualIncome: number;
  selectedMainIncome: number;
  selectedBonusMoney: number;
  selectedExpenseTotal: number;
  selectedReceivedMoney: number;
  selectedHours: number;
  weekIncome: number;
  monthIncome: number;
  actualMoney: number;
  totalJourneyMoney: number;
  balanceCheckSectionRef: RefObject<HTMLDivElement | null>;
  renderBalanceCheckCard: (title?: string) => ReactNode;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function HomePage({
  isSelectedToday,
  selectedDate,
  goals,
  isBigGoalBehind,
  daysLeft,
  goToPreviousDay,
  goToNextDay,
  goToToday,
  handleSelectDate,
  todayString,
  todayChecklistDoneCount,
  todayGoalPaceRemaining,
  needPerDay,
  todayActualIncome,
  todayDailyIncomeRemaining,
  todayWorkActualIncome,
  todayEntry,
  todayExpense,
  todayBalanceCheck,
  todayExpenseTotal,
  dataWarnings,
  goToTodayEntryForm,
  goToTodayBalanceCheck,
  openCloseDay,
  onDataWarningAction,
  selectedActualIncome,
  selectedMainIncome,
  selectedBonusMoney,
  selectedExpenseTotal,
  selectedReceivedMoney,
  selectedHours,
  weekIncome,
  monthIncome,
  actualMoney,
  totalJourneyMoney,
  balanceCheckSectionRef,
  renderBalanceCheckCard,
  navigateTo,
}: HomePageProps) {
  return (
    <>
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {isSelectedToday ? "Mục tiêu hôm nay" : "Mục tiêu ngày đang xem"}
            </h2>

            <p className="text-sm text-slate-500">
              Ngày:{" "}
              <strong>
                {isSelectedToday ? "Hôm nay" : formatDateShort(selectedDate)}
              </strong>
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div
                title={`Mục tiêu chính: ${goals.bigGoalName}`}
                className={`rounded-2xl px-4 py-3 ${
                  isBigGoalBehind ? "bg-red-50" : "bg-slate-900 text-white"
                }`}
              >
                <p
                  className={`text-xs ${
                    isBigGoalBehind ? "text-red-600" : "text-slate-200"
                  }`}
                >
                  Mục tiêu chính
                </p>

                <div className="flex items-end gap-1">
                  <span
                    className={`text-3xl font-black ${
                      isBigGoalBehind ? "text-red-600" : "text-white"
                    }`}
                  >
                    {daysLeft}
                  </span>
                  <span
                    className={`pb-1 text-sm font-medium ${
                      isBigGoalBehind ? "text-red-600" : "text-slate-200"
                    }`}
                  >
                    ngày
                  </span>
                </div>
              </div>

              {(goals.subGoals ?? []).map((goal) => {
                const subDaysLeft = getDaysLeft(goal.deadline);
                const behind = isGoalBehind(goal);

                return (
                  <div
                    key={goal.id}
                    title={`${goal.name} · còn ${subDaysLeft} ngày`}
                    className={`rounded-xl px-3 py-2 ${
                      behind ? "bg-red-50" : "bg-white"
                    } shadow-sm`}
                  >
                    <p
                      className={`text-xs ${
                        behind ? "text-red-600" : "text-slate-500"
                      }`}
                    >
                      Phụ
                    </p>

                    <p
                      className={`text-lg font-black ${
                        behind ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {subDaysLeft}
                      <span className="ml-1 text-xs font-medium">ngày</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousDay}
              className="rounded-xl border bg-white px-4 py-2 text-lg font-bold shadow-sm hover:bg-slate-100"
            >
              {"<"}
            </button>

            <button
              type="button"
              onClick={goToNextDay}
              disabled={isSelectedToday}
              className={`rounded-xl border bg-white px-4 py-2 text-lg font-bold shadow-sm ${
                isSelectedToday
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              {">"}
            </button>

            <button
              type="button"
              onClick={goToToday}
              disabled={isSelectedToday}
              className={`rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm ${
                isSelectedToday
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              Hôm nay
            </button>

            <input
              type="date"
              value={selectedDate}
              max={todayString}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="rounded-xl border bg-white px-4 py-2 text-sm shadow-sm"
            />
          </div>
        </div>

        <TodayDashboard
          todayString={todayString}
          todayChecklistDoneCount={todayChecklistDoneCount}
          todayGoalPaceRemaining={todayGoalPaceRemaining}
          needPerDay={needPerDay}
          todayActualIncome={todayActualIncome}
          todayDailyIncomeRemaining={todayDailyIncomeRemaining}
          dailyIncomeGoal={goals.dailyIncome}
          todayWorkActualIncome={todayWorkActualIncome}
          todayEntry={todayEntry}
          todayExpense={todayExpense}
          todayBalanceCheck={todayBalanceCheck}
          todayExpenseTotal={todayExpenseTotal}
          onEntryClick={goToTodayEntryForm}
          onExpenseClick={goToTodayEntryForm}
          onBalanceCheckClick={goToTodayBalanceCheck}
        />

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            title={
              isSelectedToday ? "Tiền thực tế hôm nay" : "Tiền thực tế ngày này"
            }
            value={formatMoney(selectedActualIncome)}
            target={`Làm: ${formatMoney(
              selectedMainIncome
            )} + Thưởng: ${formatMoney(selectedBonusMoney)} - Chi: ${formatMoney(
              selectedExpenseTotal
            )} | Nhận: ${formatMoney(selectedReceivedMoney)}`}
            progress={getProgress(selectedActualIncome, goals.dailyIncome)}
          />

          <StatCard
            title={isSelectedToday ? "Giờ làm hôm nay" : "Giờ làm ngày này"}
            value={`${selectedHours} giờ`}
            target={`${goals.dailyHours} giờ`}
            progress={getProgress(selectedHours, goals.dailyHours)}
          />

          <StatCard
            title={isSelectedToday ? "Tiền tuần này" : "Tiền tuần đang xem"}
            value={formatMoney(weekIncome)}
            target={formatMoney(goals.weeklyIncome)}
            progress={getProgress(weekIncome, goals.weeklyIncome)}
          />

          <StatCard
            title={isSelectedToday ? "Tiền tháng này" : "Tiền tháng đang xem"}
            value={formatMoney(monthIncome)}
            target={formatMoney(goals.monthlyIncome)}
            progress={getProgress(monthIncome, goals.monthlyIncome)}
          />

          <StatCard
            title="Tiền thực tế App tính hiện có:"
            value={formatMoney(actualMoney)}
            target={formatMoney(goals.bigGoalTarget)}
            progress={getProgress(actualMoney, goals.bigGoalTarget)}
          />

          <StatCard
            title="Tổng tiền hành trình"
            value={formatMoney(totalJourneyMoney)}
            target={formatMoney(goals.bigGoalTarget)}
            progress={getProgress(totalJourneyMoney, goals.bigGoalTarget)}
          />
        </div>

        <DataWarningsPanel
          warnings={dataWarnings}
          onAction={onDataWarningAction}
        />

        <div ref={balanceCheckSectionRef}>
          {renderBalanceCheckCard("Kiểm kê số dư hôm nay")}
        </div>
      </section>

      {/* <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HomeAction
          icon="🎯"
          title="Các mục tiêu và biến động số dư"
          description="Xem mục tiêu lớn, mục tiêu ngày, tuần và tháng."
          onClick={() => navigateTo("goals", "menu")}
        />

        <HomeAction
          icon="✅"
          title="Chốt ngày"
          description="Nhập nhanh tiền, chi tiêu, tâm trạng và ghi chú cuối ngày."
          onClick={openCloseDay}
        />

        <HomeAction
          icon="📝"
          title="Ghi nhật kí"
          description="Ghi lại hôm nay làm gì, kiếm được bao nhiêu và làm mấy giờ."
          onClick={() => navigateTo("entry")}
        />

        <HomeAction
          icon="📚"
          title="Lịch sử nhật kí"
          description="Xem lại, sửa hoặc xóa các ngày đã ghi."
          onClick={() => navigateTo("history")}
        />

        <HomeAction
          icon="💸"
          title="Lịch sử chi tiêu"
          description="Xem lại chi tiêu ăn uống và các khoản khác theo ngày."
          onClick={() => navigateTo("expenses")}
        />

        <HomeAction
          icon="🧾"
          title="Lịch sử kiểm kê"
          description="Xem lại tiền mặt, tiền tài khoản và hao hụt từng ngày."
          onClick={() => navigateTo("balanceChecks")}
        />
      </section> */}
    </>
  );
}

type HomeActionProps = {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
};

function HomeAction({ icon, title, description, onClick }: HomeActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-3xl">{icon}</p>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </button>
  );
}
