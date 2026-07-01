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
import { getToday } from "../utils/date";
import { getExpenseTotal, getTotalEntryMoney } from "../utils/entries";
import {
  buildSubGoalProgressData,
  getDailyNeedForGoal,
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
  return (

  <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Các mục tiêu</h2>
        <p className="text-sm text-slate-500">
          Quản lý mục tiêu hiện tại và xem lại các mục tiêu đã hoàn thành.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigateTo("home", "menu")}
        className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
      >
        Về trang chủ
      </button>
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



            <div className="mt-4">

              <ProgressBar value={progress} />

              <p className="mt-2 text-sm font-medium">

                Hoàn thành {progress}%

              </p>

            </div>



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
            {goalForecast.scenarios.map((scenario) => (
              <article key={scenario.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{scenario.label}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatMoney(scenario.averagePerDay)} / ngày
                    </p>
                  </div>

                  {scenario.deadlineDelayDays !== null && (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                      Trễ {scenario.deadlineDelayDays} ngày
                    </span>
                  )}
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
                  độ trung bình {formatMoney(goalForecast.averagePerDay)} mỗi
                  ngày.
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
        <div>
          <button
            type="button"
            onClick={() => setGoalScreen("menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Các mục tiêu đã hoàn thành</h2>

          {completedGoals.length === 0 ? (
            <p className="mt-4 text-slate-500">
              Bạn chưa hoàn thành mục tiêu nào.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {completedGoals.map((goal) => (
                <article key={goal.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{goal.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Hoàn thành ngày: {goal.completedAt}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                        Đã hoàn thành
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompletedGoalId(goal.id);
                          navigateTo("goals", "completedDetail");
                        }}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
                      >
                        Xem chi tiết
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCompletedGoal(goal.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Mục tiêu</p>
                      <p className="font-bold">{formatMoney(goal.target)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Đã có khi hoàn thành</p>
                      <p className="font-bold">{formatMoney(goal.saved)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Hạn mục tiêu</p>
                      <p className="font-bold">{goal.deadline}</p>
                    </div>
                  </div>
                </article>
              ))}
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

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Mục tiêu</p>
            <p className="mt-1 text-lg font-bold">
              {formatMoney(selectedCompletedGoal.target)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Đã đạt</p>
            <p className="mt-1 text-lg font-bold">
              {formatMoney(selectedCompletedGoal.saved)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Deadline</p>
            <p className="mt-1 text-lg font-bold">
              {selectedCompletedGoal.deadline}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Ngày hoàn thành</p>
            <p className="mt-1 text-lg font-bold">
              {selectedCompletedGoal.completedAt}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold">
            Biến động tiền của mục tiêu này
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Gồm tổng tiền và tiền thực tế hiện có trong thời gian thực hiện mục
            tiêu.
          </p>

          {!selectedCompletedGoal.balanceSnapshots ||
          selectedCompletedGoal.balanceSnapshots.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
              Mục tiêu này chưa có dữ liệu biến động tiền. Những mục tiêu hoàn
              thành trước khi thêm chức năng này có thể sẽ không có biểu đồ.
            </p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={selectedCompletedGoal.balanceSnapshots.map((item: BalanceSnapshot) => ({
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
          )}
        </section>

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

          {selectedCompletedGoal.contributionsSnapshot &&
  selectedCompletedGoal.contributionsSnapshot.length > 0 && (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">Lịch sử góp tiền</h3>

      <div className="mt-4 grid gap-3">
        {selectedCompletedGoal.contributionsSnapshot.map((item) => (
          <article key={item.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-bold">{item.date}</h4>
                <p className="text-sm text-slate-500">
                  Góp: {formatMoney(item.amount)}
                </p>
              </div>
            </div>

            {item.note && (
              <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {item.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng thu</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.totalIncome ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng chi</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.totalExpense ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tiền thực tế</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.actualMoney ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng hành trình</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.totalJourneyMoney ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng giờ</p>
    <p className="mt-1 text-lg font-bold">
      {selectedCompletedGoal.totalHours ?? 0} giờ
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng đơn</p>
    <p className="mt-1 text-lg font-bold">
      {selectedCompletedGoal.totalOrders ?? 0} đơn
    </p>
  </div>
</section>

        {selectedCompletedGoal.balanceSnapshots &&
        selectedCompletedGoal.balanceSnapshots.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">Chi tiết từng ngày</h3>

            <div className="mt-4 grid gap-3">
              {selectedCompletedGoal.balanceSnapshots.map((item: BalanceSnapshot) => (
                <article
                  key={item.date}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold">{item.date}</h4>
                      <p className="text-sm text-slate-500">
                        Thu: {formatMoney(item.income)} · Chi:{" "}
                        {formatMoney(item.expense)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Tổng tiền</p>
                      <p className="font-bold">{formatMoney(item.totalMoney)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Tiền thực tế</p>
                      <p className="font-bold">{formatMoney(item.actualMoney)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
  
  {selectedCompletedGoal.expensesSnapshot &&
  selectedCompletedGoal.expensesSnapshot.length > 0 && (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">Chi tiêu trong mục tiêu này</h3>

      <div className="mt-4 grid gap-3">
        {selectedCompletedGoal.expensesSnapshot.map((expense) => {
          const total = getExpenseTotal(expense);

          return (
            <article key={expense.id} className="rounded-xl border p-4">
              <div>
                <h4 className="font-bold">{expense.date}</h4>
                <p className="text-sm text-slate-500">
                  Tổng chi: {formatMoney(total)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Sáng</p>
                  <p className="font-bold">{formatMoney(expense.breakfast)}</p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Trưa</p>
                  <p className="font-bold">{formatMoney(expense.lunch)}</p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Tối</p>
                  <p className="font-bold">{formatMoney(expense.dinner)}</p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Khác</p>
                  <p className="font-bold">{formatMoney(expense.other)}</p>
                </div>
              </div>

              {expense.note && (
                <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                  {expense.note}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  )}

  {selectedCompletedGoal.entriesSnapshot &&
  selectedCompletedGoal.entriesSnapshot.length > 0 && (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">Nhật ký trong mục tiêu này</h3>

      <div className="mt-4 grid gap-3">
        {selectedCompletedGoal.entriesSnapshot.map((entry) => (
          <article key={entry.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-bold">{entry.date}</h4>
                <p className="text-sm text-slate-500">
                  Thu: {formatMoney(getTotalEntryMoney(entry))} ·{" "}
                  {entry.workHours} giờ · {entry.orderCount ?? 0} đơn
                </p>
              </div>
            </div>

            {entry.diary && (
              <p className="mt-3 whitespace-pre-line text-sm">{entry.diary}</p>
            )}

            {entry.note && (
              <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {entry.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )}
      </>
    )}
  </>
    )}
      </>
  );
}
