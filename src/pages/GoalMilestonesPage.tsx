import { ProgressBar } from "../components/ProgressBar";
import type { Goals } from "../types";
import { getDateString, getToday, toDate } from "../utils/date";
import { formatMoney } from "../utils/money";

type GoalMilestonesPageProps = {
  goals: Goals;
  totalSavedForBigGoal: number;
  onBack: () => void;
};

type MilestonePercent = 25 | 50 | 75 | 100;

type GoalMilestone = {
  percent: MilestonePercent;
  amount: number;
  dueDate: string;
  reached: boolean;
  overdue: boolean;
  remaining: number;
  daysToDueDate: number;
  needPerDay: number;
};

const MILESTONE_PERCENTS: MilestonePercent[] = [25, 50, 75, 100];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function getDaysBetween(fromDate: string, toDateString: string) {
  const from = toDate(fromDate);
  const to = toDate(toDateString);

  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function addDays(dateString: string, days: number) {
  const date = toDate(dateString);
  date.setDate(date.getDate() + days);

  return getDateString(date);
}

function buildGoalMilestones(
  goals: Goals,
  totalSavedForBigGoal: number
): GoalMilestone[] {
  const target = Math.max(goals.bigGoalTarget ?? 0, 0);
  const startDate = goals.bigGoalStartDate || getToday();
  const deadline = goals.bigGoalDeadline || getToday();
  const today = getToday();

  const totalGoalDays = Math.max(getDaysBetween(startDate, deadline), 0);

  return MILESTONE_PERCENTS.map((percent) => {
    const amount = Math.ceil((target * percent) / 100);
    const milestoneDayOffset = Math.ceil((totalGoalDays * percent) / 100);
    const dueDate = addDays(startDate, milestoneDayOffset);

    const reached = target > 0 && totalSavedForBigGoal >= amount;
    const remaining = Math.max(amount - totalSavedForBigGoal, 0);
    const daysToDueDate = Math.max(getDaysBetween(today, dueDate), 0);
    const overdue = !reached && dueDate < today;

    const needPerDay = reached
      ? 0
      : daysToDueDate > 0
        ? Math.ceil(remaining / daysToDueDate)
        : remaining;

    return {
      percent,
      amount,
      dueDate,
      reached,
      overdue,
      remaining,
      daysToDueDate,
      needPerDay,
    };
  });
}

export function GoalMilestonesPage({
  goals,
  totalSavedForBigGoal,
  onBack,
}: GoalMilestonesPageProps) {
  const target = Math.max(goals.bigGoalTarget ?? 0, 0);
  const milestones = buildGoalMilestones(goals, totalSavedForBigGoal);

  const reachedMilestones = milestones.filter((milestone) => milestone.reached);
  const nextMilestone = milestones.find((milestone) => !milestone.reached);

  const currentProgress =
    target > 0 ? clampProgress(Math.round((totalSavedForBigGoal / target) * 100)) : 0;

  const reachedText =
    reachedMilestones.length > 0
      ? reachedMilestones.map((milestone) => `${milestone.percent}%`).join(", ")
      : "Chưa vượt mốc nào";

  const nextMilestoneText = nextMilestone
    ? `${nextMilestone.percent}%`
    : "Đã đạt 100%";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Mốc kiểm tra mục tiêu</h2>
          <p className="text-sm text-slate-500">
            Theo dõi các mốc 25%, 50%, 75% và 100% của mục tiêu lớn.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Quay lại
        </button>
      </div>

      {target <= 0 ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-bold">Bạn chưa đặt số tiền mục tiêu.</p>
          <p className="mt-1 text-sm text-slate-500">
            Hãy quay lại phần mục tiêu lớn và nhập số tiền cần đạt trước.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{goals.bigGoalName}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Từ {goals.bigGoalStartDate} đến {goals.bigGoalDeadline}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm">
                Tiến độ hiện tại: <strong>{currentProgress}%</strong>
              </div>
            </div>

            <div className="mt-5">
              <ProgressBar value={currentProgress} />

              <p className="mt-2 text-sm font-medium">
                Đã có {formatMoney(totalSavedForBigGoal)} / {formatMoney(target)}
              </p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Đã vượt mốc</p>
              <p className="mt-1 font-bold text-green-700">{reachedText}</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Mốc kế tiếp</p>
              <p className="mt-1 font-bold">{nextMilestoneText}</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Còn đến mốc kế tiếp</p>
              <p className="mt-1 font-bold">
                {nextMilestone ? formatMoney(nextMilestone.remaining) : "0đ"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Cần mỗi ngày</p>
              <p className="mt-1 font-bold">
                {nextMilestone ? formatMoney(nextMilestone.needPerDay) : "0đ"}
              </p>
            </div>
          </section>

          {nextMilestone && (
            <section
              className={`rounded-2xl p-5 shadow-sm ${
                nextMilestone.overdue ? "bg-red-50" : "bg-white"
              }`}
            >
              <h3 className="text-xl font-bold">Thông báo mốc kế tiếp</h3>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-white/80 p-3">
                  <p className="text-sm text-slate-500">Mốc cần đạt</p>
                  <p className="font-bold">{nextMilestone.percent}%</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tương đương {formatMoney(nextMilestone.amount)}
                  </p>
                </div>

                <div className="rounded-xl bg-white/80 p-3">
                  <p className="text-sm text-slate-500">
                    Còn bao lâu đến mốc kế tiếp
                  </p>
                  <p
                    className={`font-bold ${
                      nextMilestone.overdue ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {nextMilestone.overdue
                      ? "Đã quá hạn mốc"
                      : `${nextMilestone.daysToDueDate} ngày`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ngày nên đạt: {nextMilestone.dueDate}
                  </p>
                </div>

                <div className="rounded-xl bg-white/80 p-3">
                  <p className="text-sm text-slate-500">
                    Cần/ngày để đạt mốc
                  </p>
                  <p className="font-bold">
                    {formatMoney(nextMilestone.needPerDay)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tính theo số ngày còn lại đến mốc.
                  </p>
                </div>
              </div>
            </section>
          )}

          {!nextMilestone && (
            <section className="rounded-2xl bg-green-50 p-5 shadow-sm">
              <h3 className="text-xl font-bold text-green-700">
                Bạn đã đạt đủ 100% mục tiêu 🎉
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Có thể bấm hoàn thành mục tiêu để lưu lại hành trình này.
              </p>
            </section>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">Chi tiết từng mốc</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {milestones.map((milestone) => (
                <article
                  key={milestone.percent}
                  className={`rounded-2xl border p-4 ${
                    milestone.reached
                      ? "border-green-200 bg-green-50"
                      : milestone.overdue
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-bold">{milestone.percent}%</p>
                      <p className="text-sm text-slate-500">
                        {formatMoney(milestone.amount)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        milestone.reached
                          ? "bg-green-100 text-green-700"
                          : milestone.overdue
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {milestone.reached
                        ? "Đã vượt"
                        : milestone.overdue
                          ? "Quá hạn"
                          : "Sắp tới"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      Ngày nên đạt: <strong>{milestone.dueDate}</strong>
                    </p>

                    <p>
                      Còn thiếu:{" "}
                      <strong>{formatMoney(milestone.remaining)}</strong>
                    </p>

                    <p>
                      Còn lại:{" "}
                      <strong>
                        {milestone.reached
                          ? "Đã đạt"
                          : milestone.overdue
                            ? "0 ngày"
                            : `${milestone.daysToDueDate} ngày`}
                      </strong>
                    </p>

                    <p>
                      Cần/ngày:{" "}
                      <strong>{formatMoney(milestone.needPerDay)}</strong>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}