import { CircleCheck, Flag } from "lucide-react";
import { ProgressBar } from "../components/ProgressBar";
import type { Goals } from "../types";
import { formatReportDate, getDateString, getToday, toDate } from "../utils/date";
import { formatMoney } from "../utils/money";

type GoalMilestonesPageProps = {
  goals: Goals;
  totalSavedForBigGoal: number;
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
    <div className="goal-milestones-page">
      {target <= 0 ? (
        <section className="goals-empty-state">
          <Flag aria-hidden="true" size={28} />
          <h2>Chưa có mốc để theo dõi</h2>
          <p>Hãy nhập số tiền mục tiêu chính trước khi theo dõi các cột mốc.</p>
        </section>
      ) : (
        <>
          <section className="goal-milestones-hero">
            <div className="goal-milestones-hero__heading">
              <div>
                <p className="goals-overview__kicker">
                  <Flag aria-hidden="true" size={17} />
                  Mục tiêu chính
                </p>
                <h2>{goals.bigGoalName}</h2>
              </div>
              <strong>{currentProgress}%</strong>
            </div>

            <p className="goal-milestones-hero__money">
              <strong>{formatMoney(totalSavedForBigGoal)}</strong> / {formatMoney(target)}
            </p>
            <ProgressBar label={`Tiến độ ${goals.bigGoalName}`} value={currentProgress} />

            <dl className="goal-milestones-hero__summary">
              <div>
                <dt>Mốc đã đạt</dt>
                <dd>{reachedText}</dd>
              </div>
              <div>
                <dt>Mốc tiếp theo</dt>
                <dd>{nextMilestoneText}</dd>
              </div>
              <div>
                <dt>Còn thiếu đến mốc</dt>
                <dd>{nextMilestone ? formatMoney(nextMilestone.remaining) : "0 đ"}</dd>
              </div>
              <div>
                <dt>Dự kiến đạt</dt>
                <dd>
                  {nextMilestone && !nextMilestone.overdue
                    ? formatReportDate(nextMilestone.dueDate)
                    : nextMilestone?.overdue
                      ? "Đã quá hạn mốc"
                      : "Đã đạt"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="goal-milestones-timeline-section">
            <div className="goals-section-heading">
              <div>
                <h2>Hành trình cột mốc</h2>
                <p>Mốc tiếp theo được làm nổi bật để bạn dễ theo dõi.</p>
              </div>
            </div>

            <div className="goal-milestones-timeline">
              {milestones.map((milestone) => (
                <article
                  key={milestone.percent}
                  className={`goal-milestone${milestone.reached ? " is-reached" : ""}${
                    nextMilestone?.percent === milestone.percent ? " is-next" : ""
                  }${milestone.overdue ? " is-overdue" : ""}`}
                >
                  <div className="goal-milestone__marker" aria-hidden="true">
                    {milestone.reached ? <CircleCheck size={20} /> : <Flag size={18} />}
                  </div>
                  <div className="goal-milestone__content">
                    <div>
                      <strong>{milestone.percent}%</strong>
                      <span>
                        {milestone.reached
                          ? "Đã đạt"
                          : milestone.overdue
                            ? "Quá hạn"
                            : nextMilestone?.percent === milestone.percent
                              ? "Đang tiến tới"
                              : "Chưa đạt"}
                      </span>
                    </div>
                    <dl>
                      <div><dt>Số tiền mốc</dt><dd>{formatMoney(milestone.amount)}</dd></div>
                      <div><dt>Còn thiếu</dt><dd>{formatMoney(milestone.remaining)}</dd></div>
                      <div><dt>Ngày dự kiến</dt><dd>{formatReportDate(milestone.dueDate)}</dd></div>
                      <div><dt>Cần mỗi ngày</dt><dd>{formatMoney(milestone.needPerDay)}</dd></div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {nextMilestone && (
            <section className={`goal-next-milestone${nextMilestone.overdue ? " is-overdue" : ""}`}>
              <div>
                <p>Mốc tiếp theo: {nextMilestone.percent}%</p>
                <h2>Còn thiếu {formatMoney(nextMilestone.remaining)}</h2>
                <span>
                  {nextMilestone.overdue
                    ? "Mốc này đã quá ngày dự kiến."
                    : `Dự kiến đạt ${formatReportDate(nextMilestone.dueDate)}.`}
                </span>
              </div>
              <strong>{formatMoney(nextMilestone.needPerDay)}/ngày</strong>
            </section>
          )}
        </>
      )}
    </div>
  );
}
