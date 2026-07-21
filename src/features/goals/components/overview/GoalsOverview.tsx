import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleCheck,
  Flag,
  Plus,
  Target,
  WalletCards,
} from "lucide-react";
import type {
  BalanceSnapshot,
  CompletedGoal,
  GoalScreen,
  Goals,
  Page,
} from "../../../../types";
import { formatReportDate, getDaysLeft } from "../../../../utils/date";
import { getProgress, getSubGoalSaved } from "../../../../utils/goals";
import { formatMoney } from "../../../../utils/money";

type GoalsOverviewProps = {
  balanceHistory: BalanceSnapshot[];
  completedGoals: CompletedGoal[];
  goals: Goals;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
  onAddSubGoal: () => void;
  totalSavedForBigGoal: number;
};

type GoalModuleCardProps = {
  action: string;
  description: string;
  icon: typeof Target;
  meta?: string;
  onClick: () => void;
  title: string;
  value: string;
};

function GoalModuleCard({
  action,
  description,
  icon: Icon,
  meta,
  onClick,
  title,
  value,
}: GoalModuleCardProps) {
  return (
    <article className="goal-module-card">
      <div className="goal-module-card__icon" aria-hidden="true">
        <Icon size={21} />
      </div>
      <div className="goal-module-card__body">
        <p className="goal-module-card__label">{title}</p>
        <strong>{value}</strong>
        <p>{description}</p>
        {meta && <span>{meta}</span>}
      </div>
      <button type="button" className="goal-module-card__action" onClick={onClick}>
        {action}
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </article>
  );
}

function getLatestCompletedGoal(completedGoals: CompletedGoal[]) {
  return [...completedGoals].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  )[0];
}

export function GoalsOverview({
  balanceHistory,
  completedGoals,
  goals,
  navigateTo,
  onAddSubGoal,
  totalSavedForBigGoal,
}: GoalsOverviewProps) {
  const target = Math.max(goals.bigGoalTarget ?? 0, 0);
  const progress = getProgress(totalSavedForBigGoal, target);
  const remaining = Math.max(target - totalSavedForBigGoal, 0);
  const daysLeft = getDaysLeft(goals.bigGoalDeadline);
  const activeSubGoals = goals.subGoals ?? [];
  const totalSubGoalSaved = activeSubGoals.reduce(
    (sum, goal) => sum + getSubGoalSaved(goal),
    0
  );
  const latestCompleted = getLatestCompletedGoal(completedGoals);
  const sortedBalanceHistory = [...balanceHistory].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const latestBalance = sortedBalanceHistory.at(-1);
  const previousBalance = sortedBalanceHistory.at(-2);
  const balanceChange = latestBalance
    ? latestBalance.actualMoney - (previousBalance?.actualMoney ?? latestBalance.actualMoney)
    : 0;
  const nextMilestone = [25, 50, 75, 100].find((item) => progress < item);
  const nextMilestoneAmount = nextMilestone
    ? Math.ceil((target * nextMilestone) / 100)
    : target;
  const remainingToMilestone = Math.max(
    nextMilestoneAmount - totalSavedForBigGoal,
    0
  );

  return (
    <div className="goals-overview">
      <section className="goals-overview__hero">
        {target > 0 ? (
          <>
            <div className="goals-overview__hero-heading">
              <div>
                <p className="goals-overview__kicker">
                  <Target aria-hidden="true" size={17} />
                  Mục tiêu chính
                </p>
                <h2>{goals.bigGoalName || "Mục tiêu chưa đặt tên"}</h2>
              </div>
              <strong className="goals-overview__percent">{progress}%</strong>
            </div>

            <p className="goals-overview__money">
              <strong>{formatMoney(totalSavedForBigGoal)}</strong>
              <span>/ {formatMoney(target)}</span>
            </p>

            <div
              className="goals-progress"
              role="progressbar"
              aria-label={`Tiến độ mục tiêu ${goals.bigGoalName}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>

            <dl className="goals-overview__hero-metrics">
              <div>
                <dt>Còn thiếu</dt>
                <dd>{formatMoney(remaining)}</dd>
              </div>
              <div>
                <dt>Thời gian còn lại</dt>
                <dd>{daysLeft} ngày</dd>
              </div>
              <div>
                <dt>Hạn mục tiêu</dt>
                <dd>{formatReportDate(goals.bigGoalDeadline)}</dd>
              </div>
            </dl>

            <div className="goals-overview__hero-actions">
              <button
                type="button"
                className="goals-button goals-button--primary"
                onClick={() => navigateTo("goals", "current")}
              >
                Xem mục tiêu
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button
                type="button"
                className="goals-button goals-button--secondary"
                onClick={() => navigateTo("goals", "current")}
              >
                Cập nhật tiến độ
              </button>
            </div>
          </>
        ) : (
          <div className="goals-empty-state">
            <Target aria-hidden="true" size={28} />
            <h2>Chưa có mục tiêu chính</h2>
            <p>Hãy tạo mục tiêu đầu tiên để bắt đầu theo dõi tiến độ tài chính.</p>
            <button
              type="button"
              className="goals-button goals-button--primary"
              onClick={() => navigateTo("goals", "current")}
            >
              Tạo mục tiêu chính
            </button>
          </div>
        )}
      </section>

      <section className="goals-overview__summary" aria-label="Tóm tắt mục tiêu">
        <div>
          <span>Mục tiêu phụ</span>
          <strong>{activeSubGoals.length} đang hoạt động</strong>
        </div>
        <div>
          <span>Đã phân bổ</span>
          <strong>{formatMoney(totalSubGoalSaved)}</strong>
        </div>
        <div>
          <span>Đã hoàn thành</span>
          <strong>{completedGoals.length} mục tiêu</strong>
        </div>
        <div>
          <span>Mốc tiếp theo</span>
          <strong>{nextMilestone ? `${nextMilestone}%` : "Đã đạt 100%"}</strong>
        </div>
      </section>

      <div className="goals-overview__section-heading">
        <div>
          <h2>Tổng quan hệ thống mục tiêu</h2>
          <p>Mở từng khu vực để xem dữ liệu và thao tác chi tiết.</p>
        </div>
        <button
          type="button"
          className="goals-button goals-button--primary"
          onClick={onAddSubGoal}
        >
          <Plus aria-hidden="true" size={18} />
          Thêm mục tiêu phụ
        </button>
      </div>

      <section className="goals-overview__modules">
        <GoalModuleCard
          title="Mục tiêu phụ"
          value={`${activeSubGoals.length} mục tiêu`}
          description={`Đã góp hoặc phân bổ ${formatMoney(totalSubGoalSaved)}.`}
          meta={
            activeSubGoals[0]
              ? `Gần nhất: ${activeSubGoals[0].name}`
              : "Chưa có mục tiêu phụ"
          }
          action="Quản lý mục tiêu phụ"
          icon={WalletCards}
          onClick={() => navigateTo("goals", "subGoals")}
        />
        <GoalModuleCard
          title="Biến động tiền"
          value={formatMoney(latestBalance?.actualMoney ?? totalSavedForBigGoal)}
          description={`Thay đổi gần nhất: ${balanceChange >= 0 ? "+" : "−"}${formatMoney(
            Math.abs(balanceChange)
          )}.`}
          meta={latestBalance ? `Cập nhật ${formatReportDate(latestBalance.date)}` : "Chưa có dữ liệu theo ngày"}
          action="Xem biến động"
          icon={ChartNoAxesCombined}
          onClick={() => navigateTo("goals", "balance")}
        />
        <GoalModuleCard
          title="Đã hoàn thành"
          value={`${completedGoals.length} mục tiêu`}
          description={
            latestCompleted
              ? `Gần nhất: ${latestCompleted.name}`
              : "Chưa có mục tiêu hoàn thành."
          }
          meta={
            latestCompleted
              ? `Hoàn thành ${formatReportDate(latestCompleted.completedAt)}`
              : undefined
          }
          action="Xem lịch sử"
          icon={CircleCheck}
          onClick={() => navigateTo("goals", "completed")}
        />
        <GoalModuleCard
          title="Mốc kiểm tra"
          value={nextMilestone ? `${nextMilestone}% tiếp theo` : "Đã đạt 100%"}
          description={
            nextMilestone
              ? `Còn thiếu ${formatMoney(remainingToMilestone)} để chạm mốc.`
              : "Mục tiêu chính đã vượt tất cả cột mốc."
          }
          meta={daysLeft > 0 ? `${daysLeft} ngày tới hạn mục tiêu` : undefined}
          action="Xem các mốc"
          icon={Flag}
          onClick={() => navigateTo("goals", "milestones")}
        />
      </section>
    </div>
  );
}
