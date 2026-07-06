import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProgressBar } from "../components/ProgressBar";
import type {
  BalanceSnapshot,
  CompletedGoal,
  GoalScreen,
  Goals,
  Page,
} from "../types";
import { getDaysLeft, getToday } from "../utils/date";
import { getExpenseTotal, getTotalEntryMoney } from "../utils/entries";
import {
  buildSubGoalProgressData,
  getDailyNeedForGoal,
  getGoalTimeProgress,
  getProgress,
  getSubGoalSaved,
  isGoalBehind,
} from "../utils/goals";
import { formatMoney, formatMoneyInput } from "../utils/money";
import type { GoalForecast } from "../utils/forecast";
import type { DailyEntryForm } from "./EntryPage";
import { GoalMilestonesPage } from "./GoalMilestonesPage";

type SubGoalForm = {
  name: string;
  target: string;
  saved: string;
  deadline: string;
  startDate: string;
};

type MainGoalForm = {
  bigGoalName: string;
  bigGoalTarget: string;
  bigGoalSaved: string;
  bigGoalStartDate: string;
  bigGoalDeadline: string;
};

type SubGoalContributionForms = Record<
  string,
  { amount: string; note: string }
>;

const COMPLETED_DETAIL_PAGE_SIZE = 7;

type CompletedDetailPageKey =
  | "balance"
  | "contributions"
  | "balanceChecks"
  | "expenses"
  | "entries";

type CompletedDetailPanelKey = "contributions" | "expenses" | "entries";

const initialCompletedDetailPages: Record<CompletedDetailPageKey, number> = {
  balance: 1,
  contributions: 1,
  balanceChecks: 1,
  expenses: 1,
  entries: 1,
};

type GoalsPageProps = {
  addContributionToSubGoal: (goalId: string) => void;
  addSubGoal: () => void;
  balanceChartDays: "all" | number;
  balanceChartTitle: string;
  bigGoalProgress: number;
  bigGoalTimeProgress: number;
  chartData: Array<Record<string, unknown>>;
  chartDays: number;
  completeCurrentGoal: () => void;
  completedGoals: CompletedGoal[];
  completeSubGoal: (goalId: string) => void;
  currentBalanceMovementData: BalanceSnapshot[];
  currentGoalStartDate: string;
  daysLeft: number;
  deleteCompletedGoal: (id: string) => void;
  deleteSubGoal: (id: string) => void;
  forecastDays: number;
  form: DailyEntryForm;
  goalForecast: GoalForecast;
  goals: Goals;
  goalScreen: GoalScreen;
  incomePerHour: number;
  isBigGoalBehind: boolean;
  mainGoalForm: MainGoalForm;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  needPerDay: number;
  remainingBigGoal: number;
  safeChartDays: number;
  safeForecastDays: number;
  saveMainGoal: () => void;
  selectedCompletedGoal: CompletedGoal | undefined;
  setBalanceChartDays: Dispatch<SetStateAction<"all" | number>>;
  setChartDays: Dispatch<SetStateAction<number>>;
  setForecastDays: Dispatch<SetStateAction<number>>;
  setForm: Dispatch<SetStateAction<DailyEntryForm>>;
  setGoalScreen: (screen: GoalScreen) => void;
  setMainGoalForm: Dispatch<SetStateAction<MainGoalForm>>;
  setSelectedCompletedGoalId: (id: string) => void;
  setSubGoalContributionForms: Dispatch<
    SetStateAction<SubGoalContributionForms>
  >;
  setSubGoalForm: Dispatch<SetStateAction<SubGoalForm>>;
  subGoalContributionForms: SubGoalContributionForms;
  subGoalForm: SubGoalForm;
  todayString: string;
  totalSavedForBigGoal: number;
  updateGoal: (key: keyof Goals, value: string) => void;
  visibleBalanceMovementData: BalanceSnapshot[];
};

function getTrendLabel(status: GoalForecast["trendStatus"]) {
  if (status === "speedingUp") return "Đang tăng tốc";
  if (status === "slowingDown") return "Đang giảm tốc";
  if (status === "stable") return "Ổn định";
  return "Chưa đủ so sánh";
}

function getTrendClass(status: GoalForecast["trendStatus"]) {
  if (status === "speedingUp") return "bg-green-50 text-green-700";
  if (status === "slowingDown") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function getDeadlineStatusLabel(
  status: GoalForecast["scenarios"][number]["deadlineStatus"]
) {
  if (status === "reached") return "Đã đạt";
  if (status === "onTrack") return "Kịp deadline";
  if (status === "late") return "Trễ deadline";
  if (status === "notGrowing") return "Chưa đủ tốc độ";
  return "Chưa có deadline";
}

function getDeadlineStatusClass(
  status: GoalForecast["scenarios"][number]["deadlineStatus"]
) {
  if (status === "reached" || status === "onTrack") {
    return "bg-green-50 text-green-700";
  }

  if (status === "late" || status === "notGrowing") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getDeadlineGapText(gap: number | null) {
  if (gap === null) return "Chưa có deadline";
  if (gap >= 0) return `Dư ${formatMoney(gap)}/ngày`;

  return `Thiếu ${formatMoney(Math.abs(gap))}/ngày`;
}

function getDeadlineGapClass(gap: number | null) {
  if (gap === null) return "bg-slate-100 text-slate-700";
  return gap >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
}

function getPageCount(totalItems: number) {
  return Math.max(Math.ceil(totalItems / COMPLETED_DETAIL_PAGE_SIZE), 1);
}

function getPaginatedItems<T>(items: T[], page: number) {
  const start = (page - 1) * COMPLETED_DETAIL_PAGE_SIZE;

  return items.slice(start, start + COMPLETED_DETAIL_PAGE_SIZE);
}

function PaginationControls({
  currentPage,
  label,
  onPageChange,
  totalItems,
}: {
  currentPage: number;
  label: string;
  onPageChange: (page: number) => void;
  totalItems: number;
}) {
  const totalPages = getPageCount(totalItems);

  if (totalItems <= COMPLETED_DETAIL_PAGE_SIZE) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm">
      <p className="font-medium text-slate-600">
        {label}: trang {currentPage}/{totalPages} · {totalItems} bản ghi
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="rounded-lg bg-white px-3 py-1 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trước
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          className="rounded-lg bg-white px-3 py-1 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function CompletedGoalMetric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "good" | "bad";
  value: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-green-700"
      : tone === "bad"
        ? "text-red-600"
        : "text-slate-900";

  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function CompletedDetailHeader({
  count,
  title,
}: {
  count: number;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-bold">{title}</h3>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
        {count} bản ghi
      </span>
    </div>
  );
}

function CompactNote({ children }: { children: string }) {
  return (
    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {children}
    </p>
  );
}

function CompletedDetailPanelNav({
  activePanel,
  onToggle,
  options,
}: {
  activePanel: CompletedDetailPanelKey | null;
  onToggle: (panel: CompletedDetailPanelKey) => void;
  options: Array<{
    count: number;
    label: string;
    value: CompletedDetailPanelKey;
  }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const isActive = activePanel === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              disabled={option.count === 0}
              onClick={() => onToggle(option.value)}
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-sm font-bold transition sm:px-4 ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span>{option.label}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-slate-700">
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ForecastPaceCard({
  pace,
}: {
  pace: GoalForecast["paceForecasts"][number];
}) {
  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{pace.label}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {pace.fromDate} đến {pace.toDate} · {pace.daysUsed} ngày
          </p>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${getDeadlineStatusClass(
            pace.deadlineStatus
          )}`}
        >
          {getDeadlineStatusLabel(pace.deadlineStatus)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-slate-500">Ròng / ngày</p>
          <p className="font-bold">{formatMoney(pace.averagePerDay)}</p>
        </div>

        <div className={`rounded-xl p-3 ${getDeadlineGapClass(pace.averageGapToDeadline)}`}>
          <p className="opacity-80">So với deadline</p>
          <p className="font-bold">{getDeadlineGapText(pace.averageGapToDeadline)}</p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-slate-500">Ngày dự kiến</p>
          <p className="font-bold">{pace.targetDate ?? "Chưa dự đoán"}</p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-slate-500">Số ngày cần</p>
          <p className="font-bold">
            {pace.daysToTarget === null ? "Không rõ" : `${pace.daysToTarget} ngày`}
          </p>
        </div>
      </div>

      {pace.deadlineDelayDays !== null && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
          Nếu giữ tốc độ này sẽ trễ khoảng {pace.deadlineDelayDays} ngày.
        </p>
      )}
    </article>
  );
}

export function GoalsPage({
  addContributionToSubGoal,
  addSubGoal,
  balanceChartDays,
  balanceChartTitle,
  bigGoalProgress,
  bigGoalTimeProgress,
  chartData,
  chartDays,
  completeCurrentGoal,
  completedGoals,
  completeSubGoal,
  currentBalanceMovementData,
  currentGoalStartDate,
  daysLeft,
  deleteCompletedGoal,
  deleteSubGoal,
  forecastDays,
  form,
  goalForecast,
  goals,
  goalScreen,
  incomePerHour,
  isBigGoalBehind,
  mainGoalForm,
  navigateTo,
  needPerDay,
  remainingBigGoal,
  safeChartDays,
  safeForecastDays,
  saveMainGoal,
  selectedCompletedGoal,
  setBalanceChartDays,
  setChartDays,
  setForecastDays,
  setForm,
  setGoalScreen,
  setMainGoalForm,
  setSelectedCompletedGoalId,
  setSubGoalContributionForms,
  setSubGoalForm,
  subGoalContributionForms,
  subGoalForm,
  todayString,
  totalSavedForBigGoal,
  updateGoal,
  visibleBalanceMovementData,
}: GoalsPageProps) {
  const [completedDetailPages, setCompletedDetailPages] = useState(
    initialCompletedDetailPages
  );
  const [completedDetailPanel, setCompletedDetailPanel] =
    useState<CompletedDetailPanelKey | null>(null);

  function setCompletedDetailPage(
    key: CompletedDetailPageKey,
    page: number
  ) {
    setCompletedDetailPages((prev) => ({
      ...prev,
      [key]: page,
    }));
  }

  const completedBalanceSnapshots = [
    ...(selectedCompletedGoal?.balanceSnapshots ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const completedContributions = [
    ...(selectedCompletedGoal?.contributionsSnapshot ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const completedBalanceChecks = [
    ...(selectedCompletedGoal?.balanceChecksSnapshot ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const completedExpenses = [
    ...(selectedCompletedGoal?.expensesSnapshot ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const completedEntries = [
    ...(selectedCompletedGoal?.entriesSnapshot ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const paginatedCompletedBalanceSnapshots = getPaginatedItems(
    completedBalanceSnapshots,
    completedDetailPages.balance
  );
  const paginatedCompletedContributions = getPaginatedItems(
    completedContributions,
    completedDetailPages.contributions
  );
  const paginatedCompletedBalanceChecks = getPaginatedItems(
    completedBalanceChecks,
    completedDetailPages.balanceChecks
  );
  const paginatedCompletedExpenses = getPaginatedItems(
    completedExpenses,
    completedDetailPages.expenses
  );
  const paginatedCompletedEntries = getPaginatedItems(
    completedEntries,
    completedDetailPages.entries
  );
  const selectedCompletedGoalProgress = selectedCompletedGoal
    ? getProgress(selectedCompletedGoal.saved, selectedCompletedGoal.target)
    : 0;
  const selectedCompletedGoalDifference = selectedCompletedGoal
    ? selectedCompletedGoal.saved - selectedCompletedGoal.target
    : 0;
  const completedDetailPanelOptions: Array<{
    count: number;
    label: string;
    value: CompletedDetailPanelKey;
  }> = [
    {
      count: completedContributions.length,
      label: "Lịch sử góp tiền",
      value: "contributions",
    },
    {
      count: completedExpenses.length,
      label: "Chi tiêu trong mục tiêu này",
      value: "expenses",
    },
    {
      count: completedEntries.length,
      label: "Nhật ký trong mục tiêu này",
      value: "entries",
    },
  ];
  const hasCompletedDetailPanels = completedDetailPanelOptions.some(
    (option) => option.count > 0
  );

  function toggleCompletedDetailPanel(panel: CompletedDetailPanelKey) {
    setCompletedDetailPanel((current) => (current === panel ? null : panel));
  }

  return (

  <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Các mục tiêu</h2>
        <p className="text-sm text-slate-500">
          Quản lý mục tiêu hiện tại và xem lại các mục tiêu đã hoàn thành.
        </p>
      </div>

    </div>

    {goalScreen === "subGoals" && (
  <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">Mục tiêu phụ</h2>
        <p className="text-sm text-slate-500">
          Quản lý các mục tiêu phụ và góp tiền thủ công vào từng mục tiêu.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigateTo("goals", "menu")}
        className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
      >
        Quay lại
      </button>
    </div>

          <section className="rounded-2xl bg-white p-5 shadow-sm">

  <div className="flex flex-wrap items-center justify-between gap-3">

    <div>

      <h2 className="text-xl font-bold">Mục tiêu phụ</h2>

      <p className="text-sm text-slate-500">

        Chia thủ công tiền vào từng mục tiêu phụ, ví dụ: Lens, quỹ dự phòng,

        trả nợ.

      </p>

    </div>

  </div>



  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">

    <div>

      <label className="text-sm font-medium">Tên mục tiêu</label>

      <input

        value={subGoalForm.name}

        onChange={(e) =>

          setSubGoalForm((prev) => ({

            ...prev,

            name: e.target.value,

          }))

        }

        placeholder="VD: Mục tiêu phụ"

        className="mt-1 w-full rounded-xl border px-3 py-2"

      />

    </div>



    <div>

      <label className="text-sm font-medium">Số tiền cần đạt</label>

      <input

        type="text"

        inputMode="numeric"

        value={subGoalForm.target}

        onChange={(e) =>

          setSubGoalForm((prev) => ({

            ...prev,

            target: formatMoneyInput(e.target.value),

          }))

        }

        placeholder="VD: 7.000.000"

        className="mt-1 w-full rounded-xl border px-3 py-2"

      />

    </div>



    <div>

      <label className="text-sm font-medium">Đã có sẵn</label>

      <input

        type="text"

        inputMode="numeric"

        value={subGoalForm.saved}

        onChange={(e) =>

          setSubGoalForm((prev) => ({

            ...prev,

            saved: formatMoneyInput(e.target.value),

          }))

        }

        placeholder="VD: 500.000"

        className="mt-1 w-full rounded-xl border px-3 py-2"

      />

    </div>



    <div>

      <label className="text-sm font-medium">Bắt đầu</label>

      <input

        type="date"

        value={subGoalForm.startDate}

        max={todayString}

        onChange={(e) =>

          setSubGoalForm((prev) => ({

            ...prev,

            startDate: e.target.value,

          }))

        }

        className="mt-1 w-full rounded-xl border px-3 py-2"

      />

    </div>



    <div>

      <label className="text-sm font-medium">Deadline</label>

      <input

        type="date"

        value={subGoalForm.deadline}

        onChange={(e) =>

          setSubGoalForm((prev) => ({

            ...prev,

            deadline: e.target.value,

          }))

        }

        className="mt-1 w-full rounded-xl border px-3 py-2"

      />

    </div>

  </div>



  <button

    type="button"

    onClick={addSubGoal}

    className="mt-4 rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"

  >

    Thêm mục tiêu phụ

  </button>



  <div className="mt-6 grid gap-4">

    {(goals.subGoals ?? []).length === 0 ? (

      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">

        Chưa có mục tiêu phụ nào.

      </p>

    ) : (

      (goals.subGoals ?? []).map((goal) => {

        const currentSaved = getSubGoalSaved(goal);

        const progress = getProgress(currentSaved, goal.target);

        const remaining = Math.max(goal.target - currentSaved, 0);

        const dailyNeed = getDailyNeedForGoal(

          goal.target,

          currentSaved,

          goal.deadline

        );

        const behind = isGoalBehind(goal);

        const progressData = buildSubGoalProgressData(goal);
        const sortedContributions = [...goal.contributions].sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;

          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        });
        const totalContributed = Math.max(currentSaved - goal.saved, 0);
        const contributionCount = goal.contributions.length;
        const averageContribution =
          contributionCount > 0
            ? Math.round(totalContributed / contributionCount)
            : 0;
        const subGoalDaysLeft = getDaysLeft(goal.deadline);
        const timeProgress = getGoalTimeProgress(goal.startDate, goal.deadline);
        const expectedMoneyByTime = Math.round(
          goal.target * (timeProgress / 100)
        );
        const paceGap = currentSaved - expectedMoneyByTime;
        const nextMilestone = [25, 50, 75, 100].find(
          (milestone) => progress < milestone
        );
        const nextMilestoneAmount = nextMilestone
          ? Math.ceil(goal.target * (nextMilestone / 100))
          : goal.target;
        const missingToNextMilestone = Math.max(
          nextMilestoneAmount - currentSaved,
          0
        );
        const lastContribution = sortedContributions[0];



        const contributionForm = subGoalContributionForms[goal.id] ?? {

          amount: "",

          note: "",

        };



        return (

          <article key={goal.id} className="rounded-2xl border p-4">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>

                <h3 className="text-lg font-bold">{goal.name}</h3>

                <p className="text-sm text-slate-500">

                  Từ {goal.startDate} đến {goal.deadline}

                </p>

              </div>



              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  onClick={() => completeSubGoal(goal.id)}

                  className="rounded-lg bg-green-50 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100"

                >

                  Hoàn thành

                </button>



                <button

                  type="button"

                  onClick={() => deleteSubGoal(goal.id)}

                  className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"

                >

                  Xóa

                </button>

              </div>

            </div>



            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">

              <div className="rounded-xl bg-slate-100 p-3">

                <p className="text-sm text-slate-500">Đã có</p>

                <p className="font-bold">{formatMoney(currentSaved)}</p>

              </div>



              <div className="rounded-xl bg-slate-100 p-3">

                <p className="text-sm text-slate-500">Mục tiêu</p>

                <p className="font-bold">{formatMoney(goal.target)}</p>

              </div>



              <div className="rounded-xl bg-slate-100 p-3">

                <p className="text-sm text-slate-500">Còn thiếu</p>

                <p className="font-bold">{formatMoney(remaining)}</p>

              </div>



              <div className="rounded-xl bg-slate-100 p-3">

                <p className="text-sm text-slate-500">Cần mỗi ngày</p>

                <p className="font-bold">{formatMoney(dailyNeed)}</p>

              </div>



              <div

                className={`rounded-xl p-3 ${

                  behind ? "bg-red-50" : "bg-green-50"

                }`}

              >

                <p className="text-sm text-slate-500">Trạng thái</p>

                <p

                  className={`font-bold ${

                    behind ? "text-red-600" : "text-green-700"

                  }`}

                >

                  {behind ? "Đang chậm tiến độ" : "Đúng tiến độ"}

                </p>

              </div>

            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Đã góp thêm</p>
                <p className="font-bold">{formatMoney(totalContributed)}</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Số lần góp</p>
                <p className="font-bold">{contributionCount} lần</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">TB mỗi lần góp</p>
                <p className="font-bold">{formatMoney(averageContribution)}</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Còn lại</p>
                <p className="font-bold">{subGoalDaysLeft} ngày</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Tiến độ thời gian</p>
                <p className="font-bold">{timeProgress}%</p>
              </div>

              <div
                className={`rounded-xl p-3 ${
                  paceGap >= 0 ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p className="text-sm opacity-80">So với tiến độ</p>
                <p className="font-bold">
                  {paceGap >= 0 ? "Dư" : "Thiếu"}{" "}
                  {formatMoney(Math.abs(paceGap))}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Mốc kế tiếp</p>
                <p className="font-bold">
                  {nextMilestone ? `${nextMilestone}%` : "Đã đủ"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Cần tới mốc</p>
                <p className="font-bold">
                  {formatMoney(missingToNextMilestone)}
                </p>
              </div>
            </div>

            {lastContribution && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">Lần góp gần nhất</p>
                <p className="mt-1 text-slate-600">
                  {lastContribution.date} · {formatMoney(lastContribution.amount)}
                  {lastContribution.note ? ` · ${lastContribution.note}` : ""}
                </p>
              </div>
            )}



            <div className="mt-4">

              <ProgressBar value={progress} />

              <p className="mt-2 text-sm font-medium">

                Hoàn thành {progress}%

              </p>

            </div>

            {sortedContributions.length > 0 && (
              <div className="mt-4 rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold">Lịch sử góp gần đây</h4>
                  <span className="text-sm text-slate-500">
                    {sortedContributions.length} bản ghi
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {sortedContributions.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-slate-100 p-3 text-sm"
                    >
                      <div>
                        <p className="font-bold">{item.date}</p>
                        {item.note && (
                          <p className="mt-1 text-slate-500">{item.note}</p>
                        )}
                      </div>
                      <p className="font-bold">{formatMoney(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}



            <div className="mt-4 grid gap-3 md:grid-cols-3">

              <div>

                <label className="text-sm font-medium">Góp thêm</label>

                <input

                  type="text"

                  inputMode="numeric"

                  value={contributionForm.amount}

                  onChange={(e) =>

                    setSubGoalContributionForms((prev) => ({

                      ...prev,

                      [goal.id]: {

                        ...contributionForm,

                        amount: formatMoneyInput(e.target.value),

                      },

                    }))

                  }

                  placeholder="VD: 200.000"

                  className="mt-1 w-full rounded-xl border px-3 py-2"

                />

              </div>



              <div>

                <label className="text-sm font-medium">Ghi chú</label>

                <input

                  value={contributionForm.note}

                  onChange={(e) =>

                    setSubGoalContributionForms((prev) => ({

                      ...prev,

                      [goal.id]: {

                        ...contributionForm,

                        note: e.target.value,

                      },

                    }))

                  }

                  placeholder="VD: Góp từ tiền hôm nay"

                  className="mt-1 w-full rounded-xl border px-3 py-2"

                />

              </div>



              <div className="flex items-end">

                <button

                  type="button"

                  onClick={() => addContributionToSubGoal(goal.id)}

                  className="w-full rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"

                >

                  Góp vào mục tiêu

                </button>

              </div>

            </div>



            {progressData.length > 0 && (

              <div className="mt-5 h-56">

                <ResponsiveContainer width="100%" height="100%">

                  <LineChart

                    data={progressData.map((item) => ({

                      ...item,

                      label: item.date.slice(5),

                    }))}

                  >

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="label" />

                    <YAxis />

                    <Tooltip

                      formatter={(value, name) => {

                        if (name === "progress") return `${value}%`;

                        return formatMoney(Number(value));

                      }}

                    />

                    <Line

                      type="monotone"

                      dataKey="saved"

                      name="Đã có"

                      strokeWidth={3}

                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            )}

          </article>

        );

      })

    )}

  </div>

        </section> 
  </>
)}

    {goalScreen === "balance" && (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Biến động tiền</h2>
            <p className="text-sm text-slate-500">
              Tính từ ngày bắt đầu mục tiêu: {currentGoalStartDate}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo("goals", "menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Mục tiêu</p>
            <p className="mt-1 font-bold">{goals.bigGoalName}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Tổng tiền hiện tại</p>
            <p className="mt-1 font-bold">
              {formatMoney(
                currentBalanceMovementData.at(-1)?.totalMoney ?? goals.bigGoalSaved
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Tiền thực tế hiện có</p>
            <p className="mt-1 font-bold">
              {formatMoney(
                currentBalanceMovementData.at(-1)?.actualMoney ?? goals.bigGoalSaved
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Số ngày theo dõi</p>
            <p className="mt-1 font-bold">
              {currentBalanceMovementData.length} ngày
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Biểu đồ biến động</h3>
              <p className="text-sm text-slate-500">
                {balanceChartTitle}
              </p>
              <p className="text-xs text-slate-500">
                Đường tổng tiền và tiền thực tế hiện có trong mục tiêu hiện tại.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBalanceChartDays("all")}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>

              <button
                type="button"
                onClick={() => setBalanceChartDays(7)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === 7
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                7 ngày
              </button>

              <button
                type="button"
                onClick={() => setBalanceChartDays(14)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === 14
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                14 ngày
              </button>

              <button
                type="button"
                onClick={() => setBalanceChartDays(30)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === 30
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                30 ngày
              </button>

              <input
                type="text"
                inputMode="numeric"
                value={balanceChartDays === "all" ? "" : String(balanceChartDays)}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/[^\d]/g, "");

                  if (!onlyDigits) {
                    setBalanceChartDays("all");
                    return;
                  }

                  const value = Number(onlyDigits);

                  setBalanceChartDays(Math.min(Math.max(value, 1), 365));
                }}
                className="w-24 rounded-xl border px-3 py-1 text-sm"
                placeholder="Tất cả"
              />
            </div>
          </div>

          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visibleBalanceMovementData.map((item: BalanceSnapshot) => ({
                  ...item,
                  label: item.date.slice(5),
                  balanceGap: item.totalMoney - item.actualMoney,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;

                    const data = payload[0].payload as BalanceSnapshot & {
                      label: string;
                      balanceGap: number;
                    };

                    return (
                      <div className="rounded-xl border bg-white p-3 text-sm shadow-sm">
                        <p className="mb-2 font-bold">{label}</p>

                        <p className="text-slate-700">
                          Tổng tiền:{" "}
                          <strong>{formatMoney(data.totalMoney)}</strong>
                        </p>

                        <p className="text-slate-700">
                          Tiền thực tế:{" "}
                          <strong>{formatMoney(data.actualMoney)}</strong>
                        </p>

                        <p className="text-slate-700">
                          Chênh lệch:{" "}
                          <strong>{formatMoney(data.balanceGap)}</strong>
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalMoney"
                  name="Tổng tiền"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="actualMoney"
                  name="Tiền thực tế"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </>
)}

{goalScreen === "milestones" && (
  <GoalMilestonesPage
    goals={goals}
    totalSavedForBigGoal={totalSavedForBigGoal}
    onBack={() => navigateTo("goals", "menu")}
  />
)}

{goalScreen === "menu" && (
  <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
    <button
      type="button"
      onClick={() => navigateTo("goals", "current")}
      className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-3xl">🎯</p>
      <h3 className="mt-3 text-xl font-bold">Mục tiêu hiện tại</h3>
      <p className="mt-1 text-sm text-slate-500">
        Xem và chỉnh sửa mục tiêu chính, mục tiêu ngày, tuần và tháng.
      </p>
    </button>

    <button
      type="button"
      onClick={() => navigateTo("goals", "subGoals")}
      className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-3xl">📌</p>
      <h3 className="mt-3 text-xl font-bold">Mục tiêu phụ</h3>
      <p className="mt-1 text-sm text-slate-500">
        Quản lý các mục tiêu phụ như lens, quỹ dự phòng, trả nợ.
      </p>
    </button>

    <button
      type="button"
      onClick={() => navigateTo("goals", "balance")}
      className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-3xl">📈</p>
      <h3 className="mt-3 text-xl font-bold">Biến động tiền</h3>
      <p className="mt-1 text-sm text-slate-500">
        Theo dõi tiền thực tế hiện có và tổng tiền theo từng ngày.
      </p>
    </button>

    <button
      type="button"
      onClick={() => navigateTo("goals", "completed")}
      className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-3xl">✅</p>
      <h3 className="mt-3 text-xl font-bold">Mục tiêu đã hoàn thành</h3>
      <p className="mt-1 text-sm text-slate-500">
        Xem lại các mục tiêu cũ và lịch sử biến động tiền.
      </p>
    </button>

    <button
      type="button"
      onClick={() => navigateTo("goals", "milestones")}
      className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
    >
      <p className="text-3xl">🏁</p>
      <h3 className="mt-3 text-xl font-bold">Mốc kiểm tra</h3>
      <p className="mt-1 text-sm text-slate-500">
        Xem các mốc 25%, 50%, 75%, 100% và số tiền cần mỗi ngày để đạt mốc kế tiếp.
      </p>
    </button>
  </section>
)}

    {goalScreen === "current" && (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">Mục tiêu chính</h2>
          <p className="text-sm text-slate-500">
            Quản lý mục tiêu chính, mục tiêu ngày, tuần và tháng.
          </p>
      </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigateTo("goals", "menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={completeCurrentGoal}
            className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-green-700"
          >
            Hoàn thành mục tiêu
          </button>
        </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      Thu nhập {safeChartDays} ngày gần nhất
                    </h2>
                    <p className="text-sm text-slate-500">
                      Biểu đồ tính tiền làm được + tiền thưởng, không tính tiền nhận được.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChartDays(7)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        chartDays === 7
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      7 ngày
                    </button>

                    <button
                      type="button"
                      onClick={() => setChartDays(14)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        chartDays === 14
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      14 ngày
                    </button>

                    <button
                      type="button"
                      onClick={() => setChartDays(30)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        chartDays === 30
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      30 ngày
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={String(chartDays)}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/[^\d]/g, "");
                        const value = Number(onlyDigits);

                        if (!value) {
                          setChartDays(1);
                          return;
                        }

                        setChartDays(Math.min(Math.max(value, 1), 365));
                      }}
                      className="w-24 rounded-xl border px-3 py-1 text-sm"
                      placeholder="Số ngày"
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Theo dõi tiền kiếm được từng ngày.
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm">
                Tiền / giờ tháng này:{" "}
                <strong>{formatMoney(incomePerHour)}</strong>
              </div>
            </div>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot
                    name="Thu nhập"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <label className="text-sm font-medium">Tiền nhận được</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 500.000"
                  value={form.receivedMoney}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      receivedMoney: formatMoneyInput(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              <p className="mt-1 text-xs text-slate-500">
                Khoản này tính vào tổng tiền, tuần, tháng và tiền hiện có, nhưng không tính
                vào tiền thực tế hôm nay và biểu đồ 7 ngày.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Tiền thưởng</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 100.000"
                  value={form.bonusMoney}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      bonusMoney: formatMoneyInput(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              <p className="mt-1 text-xs text-slate-500">
                Khoản này được tính như thu nhập bình thường.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Mục tiêu lớn</h2>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium">Tên mục tiêu</label>
                  <input
                    value={mainGoalForm.bigGoalName}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalName: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
              </div>

              <div>
                <label className="text-sm font-medium">Số tiền cần đạt</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mainGoalForm.bigGoalTarget}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalTarget: formatMoneyInput(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
              </div>

              <div>
                <label className="text-sm font-medium">Số tiền đã có sẵn</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mainGoalForm.bigGoalSaved}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalSaved: formatMoneyInput(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
              </div>

              <div>
                <label className="text-sm font-medium">Ngày bắt đầu mục tiêu</label>
                  <input
                    type="date"
                    value={mainGoalForm.bigGoalStartDate}
                    max={todayString}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalStartDate: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                <p className="mt-1 text-xs text-slate-500">
                  Biến động tiền sẽ được tính từ ngày này. Khi hoàn thành mục tiêu, hành trình
                  mới sẽ bắt đầu lại từ đầu.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Hạn mục tiêu</label>
                <input
                  type="date"
                  value={mainGoalForm.bigGoalDeadline}
                  onChange={(e) =>
                    setMainGoalForm((prev) => ({
                      ...prev,
                      bigGoalDeadline: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveMainGoal}
              className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
            >
              Lưu mục tiêu lớn
            </button>

            <div className="mt-5 rounded-xl bg-slate-100 p-4">
              <p className="font-bold">{goals.bigGoalName}</p>
              <p className="mt-1 text-sm">
                Bắt đầu: <strong>{goals.bigGoalStartDate ?? getToday()}</strong>
              </p>
              <p className="mt-2 text-sm">
                Đã có: <strong>{formatMoney(totalSavedForBigGoal)}</strong>
              </p>

              <p className="mt-1 text-sm">
                Còn thiếu: <strong>{formatMoney(remainingBigGoal)}</strong>
              </p>

              <p className="mt-1 text-sm">
                Còn lại: <strong>{daysLeft} ngày</strong>
              </p>

              <p className="mt-1 text-sm">
                Cần mỗi ngày: <strong>{formatMoney(needPerDay)}</strong>
              </p>

              <div
                className={`mt-3 rounded-xl p-3 ${
                  isBigGoalBehind ? "bg-red-50" : "bg-green-50"
                }`}
              >
                <p className="text-sm text-slate-500">Trạng thái tiến độ</p>
                <p
                  className={`font-bold ${
                    isBigGoalBehind ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {isBigGoalBehind ? "Đang chậm tiến độ" : "Đúng tiến độ"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Tiến độ tiền: {bigGoalProgress}% · Tiến độ thời gian:{" "}
                  {bigGoalTimeProgress}%
                </p>
              </div>

              <ProgressBar value={bigGoalProgress} />

              <p className="mt-2 text-sm font-medium">
                Hoàn thành {bigGoalProgress}%
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Dự đoán ngày đạt mục tiêu</h2>
              <p className="text-sm text-slate-500">
                Dựa trên dòng tiền ròng: thu nhập thực nhận trừ chi tiêu trong
                các ngày gần nhất.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[7, 14, 30, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setForecastDays(days)}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    safeForecastDays === days
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  {days} ngày
                </button>
              ))}

              <input
                type="text"
                inputMode="numeric"
                value={String(forecastDays)}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/[^\d]/g, "");
                  const value = Number(onlyDigits);

                  if (!value) {
                    setForecastDays(1);
                    return;
                  }

                  setForecastDays(Math.min(Math.max(value, 1), 365));
                }}
                className="w-24 rounded-xl border px-3 py-1 text-sm"
                placeholder="Số ngày"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-sm text-slate-500">Khoảng dữ liệu</p>
              <p className="font-bold">
                {goalForecast.fromDate} đến {goalForecast.toDate}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {goalForecast.daysUsed} ngày được tính
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-sm text-slate-500">Dòng tiền ròng</p>
              <p className="font-bold">{formatMoney(goalForecast.netAmount)}</p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-sm text-slate-500">Trung bình / ngày</p>
              <p className="font-bold">
                {formatMoney(goalForecast.averagePerDay)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-sm text-slate-500">Còn thiếu</p>
              <p className="font-bold">{formatMoney(remainingBigGoal)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-sm text-slate-500">Trung bình 7 ngày</p>
              <p className="font-bold">
                {formatMoney(goalForecast.shortAveragePerDay)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-sm text-slate-500">Trung bình 30 ngày</p>
              <p className="font-bold">
                {formatMoney(goalForecast.longAveragePerDay)}
              </p>
            </div>

            <div
              className={`rounded-xl p-3 ${getTrendClass(
                goalForecast.trendStatus
              )}`}
            >
              <p className="text-sm opacity-80">Xu hướng tốc độ</p>
              <p className="font-bold">
                {getTrendLabel(goalForecast.trendStatus)}
              </p>
              <p className="mt-1 text-xs opacity-80">
                Chênh {formatMoney(goalForecast.trendDifference)}
                {goalForecast.trendPercent !== null
                  ? ` · ${goalForecast.trendPercent}%`
                  : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-900 p-4 text-white">
              <p className="text-sm text-slate-300">
                Tốc độ cần để kịp deadline
              </p>
              <p className="mt-1 text-2xl font-black">
                {goalForecast.requiredAveragePerDay === null
                  ? "Chưa có"
                  : formatMoney(goalForecast.requiredAveragePerDay)}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Còn {goalForecast.deadlineDaysLeft ?? 0} ngày đến deadline.
              </p>
            </div>

            <div
              className={`rounded-xl p-4 ${getDeadlineGapClass(
                goalForecast.dailyGapToDeadline
              )}`}
            >
              <p className="text-sm opacity-80">Tốc độ 7 ngày so với deadline</p>
              <p className="mt-1 text-2xl font-black">
                {getDeadlineGapText(goalForecast.dailyGapToDeadline)}
              </p>
              <p className="mt-1 text-xs opacity-80">
                Dùng tốc độ 7 ngày gần nhất làm tốc độ hiện tại.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Tốc độ thực tế đã cân bằng</p>
              <p className="mt-1 text-2xl font-black">
                {formatMoney(goalForecast.realisticAveragePerDay)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Kết hợp 7 ngày, 30 ngày và khoảng bạn đang chọn.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {goalForecast.paceForecasts.map((pace) => (
              <ForecastPaceCard key={pace.id} pace={pace} />
            ))}
          </div>

          <div className="mt-5">
            <h3 className="text-lg font-bold">
              Kịch bản thận trọng / thực tế / tốt
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              App dùng các tốc độ gần đây để ước lượng ngày đạt mục tiêu trong
              từng kịch bản.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {goalForecast.scenarios.map((scenario) => (
              <article key={scenario.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{scenario.label}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatMoney(scenario.averagePerDay)} / ngày
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${getDeadlineStatusClass(
                      scenario.deadlineStatus
                    )}`}
                  >
                    {getDeadlineStatusLabel(scenario.deadlineStatus)}
                  </span>
                </div>

                <p className="mt-3 text-sm">
                  {scenario.targetDate
                    ? `Dự kiến: ${scenario.targetDate}`
                    : "Chưa thể dự đoán với tốc độ này."}
                </p>
                {scenario.daysToTarget !== null && (
                  <p className="mt-1 text-sm text-slate-500">
                    Cần khoảng {scenario.daysToTarget} ngày.
                  </p>
                )}
                {scenario.deadlineDelayDays !== null && (
                  <p className="mt-2 text-sm font-bold text-red-600">
                    Trễ deadline khoảng {scenario.deadlineDelayDays} ngày.
                  </p>
                )}
              </article>
            ))}
          </div>

          <div
            className={`mt-4 rounded-xl p-4 ${
              goalForecast.status === "forecast"
                ? goalForecast.targetDate &&
                  goals.bigGoalDeadline &&
                  goalForecast.targetDate > goals.bigGoalDeadline
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
                : goalForecast.status === "reached"
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {goalForecast.status === "noTarget" && (
              <>
                <p className="font-bold">Chưa thể dự đoán</p>
                <p className="mt-1 text-sm">
                  Bạn cần nhập số tiền mục tiêu lớn trước.
                </p>
              </>
            )}

            {goalForecast.status === "reached" && (
              <>
                <p className="font-bold">Mục tiêu đã đạt</p>
                <p className="mt-1 text-sm">
                  Số tiền hiện tại đã bằng hoặc vượt mục tiêu.
                </p>
              </>
            )}

            {goalForecast.status === "noData" && (
              <>
                <p className="font-bold">Chưa đủ dữ liệu</p>
                <p className="mt-1 text-sm">
                  Khoảng ngày đang chọn chưa có dữ liệu trong hành trình mục
                  tiêu hiện tại.
                </p>
              </>
            )}

            {goalForecast.status === "notGrowing" && (
              <>
                <p className="font-bold">Chưa thể dự đoán ngày đạt</p>
                <p className="mt-1 text-sm">
                  Trung bình dòng tiền ròng đang không tăng. Hãy chọn khoảng
                  ngày khác hoặc nhập thêm dữ liệu thu chi.
                </p>
              </>
            )}

            {goalForecast.status === "forecast" && (
              <>
                <p className="font-bold">
                  Dự kiến đạt mục tiêu vào ngày {goalForecast.targetDate}
                </p>
                <p className="mt-1 text-sm">
                  Cần khoảng {goalForecast.daysToTarget} ngày nữa nếu giữ tốc
                  độ thực tế {formatMoney(goalForecast.realisticAveragePerDay)}
                  mỗi ngày.
                </p>
                {goalForecast.targetDate &&
                  goals.bigGoalDeadline &&
                  goalForecast.targetDate > goals.bigGoalDeadline && (
                    <p className="mt-1 text-sm font-medium">
                      Với tốc độ hiện tại sẽ trễ deadline{" "}
                      {goals.bigGoalDeadline}
                      {goalForecast.deadlineDelayDays
                        ? ` khoảng ${goalForecast.deadlineDelayDays} ngày`
                        : ""}
                      .
                    </p>
                  )}
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Mục tiêu ngày / tuần / tháng</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tiền / ngày</label>
              <input
                type="number"
                value={goals.dailyIncome}
                onChange={(e) => updateGoal("dailyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / ngày</label>
              <input
                type="number"
                value={goals.dailyHours}
                onChange={(e) => updateGoal("dailyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tiền / tuần</label>
              <input
                type="number"
                value={goals.weeklyIncome}
                onChange={(e) => updateGoal("weeklyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / tuần</label>
              <input
                type="number"
                value={goals.weeklyHours}
                onChange={(e) => updateGoal("weeklyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tiền / tháng</label>
              <input
                type="number"
                value={goals.monthlyIncome}
                onChange={(e) => updateGoal("monthlyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / tháng</label>
              <input
                type="number"
                value={goals.monthlyHours}
                onChange={(e) => updateGoal("monthlyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>
          </div>
        </section>
      </>
    )}

    {goalScreen === "completed" && (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Các mục tiêu đã hoàn thành</h2>
          <p className="text-sm text-slate-500">
            Xem lại các mục tiêu cũ và lịch sử biến động tiền.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setGoalScreen("menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>
      </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Các mục tiêu đã hoàn thành</h2>
              <p className="text-sm text-slate-500">
                Danh sách rút gọn để xem nhanh mục tiêu, số tiền đạt được và
                deadline.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
              {completedGoals.length} mục tiêu
            </span>
          </div>

          {completedGoals.length === 0 ? (
            <p className="mt-4 text-slate-500">
              Bạn chưa hoàn thành mục tiêu nào.
            </p>
          ) : (
            <div className="mt-4 divide-y rounded-xl border">
              {completedGoals.map((goal) => {
                const progress = getProgress(goal.saved, goal.target);
                const difference = goal.saved - goal.target;

                return (
                  <article key={goal.id} className="p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{goal.name}</h3>
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                            Đã hoàn thành
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                            {goal.goalType === "sub"
                              ? "Mục tiêu phụ"
                              : "Mục tiêu chính"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          Hoàn thành {goal.completedAt} · Deadline{" "}
                          {goal.deadline}
                        </p>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setCompletedDetailPanel(null);
                            setCompletedDetailPages(initialCompletedDetailPages);
                            setSelectedCompletedGoalId(goal.id);
                            navigateTo("goals", "completedDetail");
                          }}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700"
                        >
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCompletedGoal(goal.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
                      <CompletedGoalMetric
                        label="Mục tiêu"
                        value={formatMoney(goal.target)}
                      />
                      <CompletedGoalMetric
                        label="Đã đạt"
                        value={formatMoney(goal.saved)}
                      />
                      <CompletedGoalMetric
                        label="Chênh lệch"
                        value={`${difference >= 0 ? "+" : "-"}${formatMoney(
                          Math.abs(difference)
                        )}`}
                        tone={difference >= 0 ? "good" : "bad"}
                      />
                      <CompletedGoalMetric
                        label="Tiến độ"
                        value={`${progress}%`}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </>
    )}

    {goalScreen === "completedDetail" && (
  <>
    {!selectedCompletedGoal ? (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Không tìm thấy mục tiêu</h2>

        <p className="mt-2 text-sm text-slate-500">
          Có thể mục tiêu này đã bị xóa hoặc chưa được chọn.
        </p>

        <button
          type="button"
          onClick={() => navigateTo("goals", "completed")}
          className="mt-4 rounded-xl border bg-white px-4 py-2 font-medium hover:bg-slate-100"
        >
          Quay lại
        </button>
      </section>
    ) : (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              {selectedCompletedGoal.name}
            </h2>

            <p className="text-sm text-slate-500">
              Từ {selectedCompletedGoal.startDate ?? "Không rõ"} đến{" "}
              {selectedCompletedGoal.completedAt}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo("goals", "completed")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Tổng quan</h3>
              <p className="text-sm text-slate-500">
                Các số liệu chính của mục tiêu đã hoàn thành.
              </p>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-700">
              {selectedCompletedGoal.goalType === "sub"
                ? "Mục tiêu phụ"
                : "Mục tiêu chính"}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${selectedCompletedGoalProgress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <CompletedGoalMetric
              label="Mục tiêu"
              value={formatMoney(selectedCompletedGoal.target)}
            />
            <CompletedGoalMetric
              label="Đã đạt"
              value={formatMoney(selectedCompletedGoal.saved)}
            />
            <CompletedGoalMetric
              label="Chênh lệch"
              value={`${
                selectedCompletedGoalDifference >= 0 ? "+" : "-"
              }${formatMoney(Math.abs(selectedCompletedGoalDifference))}`}
              tone={selectedCompletedGoalDifference >= 0 ? "good" : "bad"}
            />
            <CompletedGoalMetric
              label="Tiến độ"
              value={`${selectedCompletedGoalProgress}%`}
            />
            <CompletedGoalMetric
              label="Deadline"
              value={selectedCompletedGoal.deadline}
            />
            <CompletedGoalMetric
              label="Hoàn thành"
              value={selectedCompletedGoal.completedAt}
            />
            <CompletedGoalMetric
              label="Tổng thu"
              value={formatMoney(selectedCompletedGoal.totalIncome ?? 0)}
            />
            <CompletedGoalMetric
              label="Tổng chi"
              value={formatMoney(selectedCompletedGoal.totalExpense ?? 0)}
            />
            <CompletedGoalMetric
              label="Tiền thực tế"
              value={formatMoney(selectedCompletedGoal.actualMoney ?? 0)}
            />
            <CompletedGoalMetric
              label="Tổng hành trình"
              value={formatMoney(selectedCompletedGoal.totalJourneyMoney ?? 0)}
            />
            <CompletedGoalMetric
              label="Tổng giờ"
              value={`${selectedCompletedGoal.totalHours ?? 0} giờ`}
            />
            <CompletedGoalMetric
              label="Tổng đơn"
              value={`${selectedCompletedGoal.totalOrders ?? 0} đơn`}
            />
          </div>
        </section>

        {completedBalanceSnapshots.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <CompletedDetailHeader
              count={completedBalanceSnapshots.length}
              title="Biểu đồ biến động"
            />
            <p className="mt-1 text-sm text-slate-500">
              Tổng tiền và tiền thực tế trong thời gian thực hiện mục tiêu.
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...completedBalanceSnapshots]
                    .reverse()
                    .map((item: BalanceSnapshot) => ({
                      ...item,
                      label: item.date.slice(5),
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />

                  <Line
                    type="monotone"
                    dataKey="totalMoney"
                    name="Tổng tiền"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="actualMoney"
                    name="Tiền thực tế"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {selectedCompletedGoal.goalProgressSnapshots &&
          selectedCompletedGoal.goalProgressSnapshots.length > 0 && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold">Tiến độ mục tiêu phụ</h3>

              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={selectedCompletedGoal.goalProgressSnapshots.map((item) => ({
                      ...item,
                      label: item.date.slice(5),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "progress") return `${value}%`;
                        return formatMoney(Number(value));
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="saved"
                      name="Đã có"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

        {hasCompletedDetailPanels && (
          <CompletedDetailPanelNav
            activePanel={completedDetailPanel}
            onToggle={toggleCompletedDetailPanel}
            options={completedDetailPanelOptions}
          />
        )}

        {completedContributions.length > 0 &&
          completedDetailPanel === "contributions" && (
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <CompletedDetailHeader
                count={completedContributions.length}
                title="Lịch sử góp tiền"
              />

              <div className="mt-3 overflow-hidden rounded-xl border">
                {paginatedCompletedContributions.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 border-b p-3 text-sm last:border-b-0 sm:grid-cols-[120px_1fr_auto] sm:items-center"
                  >
                    <p className="font-bold">{item.date}</p>
                    <p className="text-slate-500">
                      {item.note || "Không có ghi chú"}
                    </p>
                    <p className="font-black text-green-700">
                      {formatMoney(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
              <PaginationControls
                currentPage={completedDetailPages.contributions}
                label="Lịch sử góp tiền"
                onPageChange={(page) =>
                  setCompletedDetailPage("contributions", page)
                }
                totalItems={completedContributions.length}
              />
            </section>
          )}

        {completedExpenses.length > 0 && completedDetailPanel === "expenses" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <CompletedDetailHeader
              count={completedExpenses.length}
              title="Chi tiêu trong mục tiêu này"
            />

            <div className="mt-3 overflow-hidden rounded-xl border">
              {paginatedCompletedExpenses.map((expense) => {
                const total = getExpenseTotal(expense);

                return (
                  <article
                    key={expense.id}
                    className="border-b p-3 last:border-b-0"
                  >
                    <div className="grid gap-2 text-sm lg:grid-cols-[110px_1fr_auto] lg:items-center">
                      <p className="font-bold">{expense.date}</p>
                      <p className="text-slate-500">
                        Sáng {formatMoney(expense.breakfast)} · Trưa{" "}
                        {formatMoney(expense.lunch)} · Tối{" "}
                        {formatMoney(expense.dinner)} ·{" "}
                        {expense.otherLabel
                          ? `Khác (${expense.otherLabel})`
                          : "Khác"}{" "}
                        {formatMoney(expense.other)}
                      </p>
                      <p className="font-black text-red-600">
                        {formatMoney(total)}
                      </p>
                    </div>

                    {expense.note && <CompactNote>{expense.note}</CompactNote>}
                  </article>
                );
              })}
            </div>
            <PaginationControls
              currentPage={completedDetailPages.expenses}
              label="Chi tiêu"
              onPageChange={(page) => setCompletedDetailPage("expenses", page)}
              totalItems={completedExpenses.length}
            />
          </section>
        )}

        {completedEntries.length > 0 && completedDetailPanel === "entries" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <CompletedDetailHeader
              count={completedEntries.length}
              title="Nhật ký trong mục tiêu này"
            />

            <div className="mt-3 overflow-hidden rounded-xl border">
              {paginatedCompletedEntries.map((entry) => (
                <article key={entry.id} className="border-b p-3 last:border-b-0">
                  <div className="grid gap-2 text-sm lg:grid-cols-[110px_1fr] lg:items-center">
                    <p className="font-bold">{entry.date}</p>
                    <p className="text-slate-500">
                      Thu {formatMoney(getTotalEntryMoney(entry))} ·{" "}
                      {entry.workHours} giờ · {entry.orderCount ?? 0} đơn
                    </p>
                  </div>

                  {entry.diary && (
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {entry.diary}
                    </p>
                  )}

                  {entry.note && <CompactNote>{entry.note}</CompactNote>}
                </article>
              ))}
            </div>
            <PaginationControls
              currentPage={completedDetailPages.entries}
              label="Nhật ký"
              onPageChange={(page) => setCompletedDetailPage("entries", page)}
              totalItems={completedEntries.length}
            />
          </section>
        )}

        {completedBalanceSnapshots.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <CompletedDetailHeader
              count={completedBalanceSnapshots.length}
              title="Chi tiết từng ngày"
            />

            <div className="mt-3 overflow-hidden rounded-xl border text-sm">
              {paginatedCompletedBalanceSnapshots.map((item: BalanceSnapshot) => (
                <div
                  key={item.date}
                  className="grid gap-2 border-b p-3 last:border-b-0 lg:grid-cols-[110px_1fr_1fr_1fr] lg:items-center"
                >
                  <p className="font-bold">{item.date}</p>
                  <p className="text-slate-500">
                    Thu {formatMoney(item.income)} · Chi{" "}
                    {formatMoney(item.expense)}
                  </p>
                  <p>
                    <span className="text-slate-500">Tổng tiền: </span>
                    <strong>{formatMoney(item.totalMoney)}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Thực tế: </span>
                    <strong>{formatMoney(item.actualMoney)}</strong>
                  </p>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={completedDetailPages.balance}
              label="Chi tiết từng ngày"
              onPageChange={(page) => setCompletedDetailPage("balance", page)}
              totalItems={completedBalanceSnapshots.length}
            />
          </section>
        )}

        {completedBalanceChecks.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <CompletedDetailHeader
              count={completedBalanceChecks.length}
              title="Kiểm kê trong mục tiêu này"
            />

            <div className="mt-3 overflow-hidden rounded-xl border">
              {paginatedCompletedBalanceChecks.map((item) => (
                <article key={item.id} className="border-b p-3 last:border-b-0">
                  <div className="grid gap-2 text-sm lg:grid-cols-[110px_1fr_auto] lg:items-center">
                    <p className="font-bold">{item.date}</p>
                    <p className="text-slate-500">
                      Mặt {formatMoney(item.cash)} · TK {formatMoney(item.bank)} ·
                      App {formatMoney(item.appMoney)} · Thực tế{" "}
                      {formatMoney(item.actualMoney)}
                    </p>
                    <p
                      className={`font-bold ${
                        item.difference < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      Lệch {formatMoney(item.difference)}
                    </p>
                  </div>
                  {item.note && <CompactNote>{item.note}</CompactNote>}
                </article>
              ))}
            </div>
            <PaginationControls
              currentPage={completedDetailPages.balanceChecks}
              label="Kiểm kê"
              onPageChange={(page) =>
                setCompletedDetailPage("balanceChecks", page)
              }
              totalItems={completedBalanceChecks.length}
            />
          </section>
        )}
  
      </>
    )}
  </>
    )}
      </>
  );
}
