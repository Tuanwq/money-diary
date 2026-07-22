import { ArrowRight, CalendarDays, Target } from "lucide-react";
import type { Goals } from "../../../../types";
import { formatMoney } from "../../../../utils/money";
import { DashboardSectionState } from "./DashboardSectionState";
import { GoalDeadlineOptions } from "./GoalDeadlineOptions";

type MainGoalCardProps = {
  daysLeft: number;
  error?: string | null;
  goals: Goals;
  isLoading?: boolean;
  name: string;
  onOpenGoals: () => void;
  onRetry?: () => void;
  onViewDetails: () => void;
  progress: number;
  remaining: number;
  saved: number;
  selectedDate: string;
  target: number;
};

export function MainGoalCard({
  daysLeft,
  error,
  goals,
  isLoading,
  name,
  onOpenGoals,
  onRetry,
  onViewDetails,
  progress,
  remaining,
  saved,
  selectedDate,
  target,
}: MainGoalCardProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <section className="money-card money-main-goal-card" aria-labelledby="main-goal-title">
      <div className="money-card-heading-row">
        <div className="money-card-heading-copy">
          <span className="money-eyebrow">
            <Target aria-hidden="true" size={16} />
            Mục tiêu chính
          </span>
          <h2 id="main-goal-title">{name || "Chưa đặt tên mục tiêu"}</h2>
        </div>
        {!isLoading && !error && target > 0 && (
          <span className="money-goal-percent">{safeProgress}%</span>
        )}
      </div>

      {isLoading || error ? (
        <DashboardSectionState
          error={error}
          isLoading={isLoading}
          onRetry={onRetry}
          variant="goals"
        />
      ) : target <= 0 ? (
        <div className="money-main-goal-empty">
          <p>Chưa có mục tiêu chính để theo dõi.</p>
          <button type="button" className="money-primary-action" onClick={onOpenGoals}>
            Thiết lập mục tiêu
          </button>
        </div>
      ) : (
        <>
          <div className="money-goal-money">
            <strong>{formatMoney(saved)}</strong>
            <span>trên {formatMoney(target)}</span>
          </div>

          <div
            className="money-progress-track"
            role="progressbar"
            aria-label={`Tiến độ mục tiêu ${name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeProgress}
          >
            <span style={{ width: `${safeProgress}%` }} />
          </div>

          <div className="money-goal-meta-grid">
            <div className="money-goal-meta-item">
              <span>Còn thiếu</span>
              <strong>{formatMoney(remaining)}</strong>
            </div>
            <div className="money-goal-meta-item">
              <span>
                <CalendarDays aria-hidden="true" size={15} /> Thời gian còn lại
              </span>
              <strong>{daysLeft} ngày</strong>
            </div>
          </div>

          <GoalDeadlineOptions
            goals={goals}
            mainGoalSaved={saved}
            onOpenGoals={onOpenGoals}
            selectedDate={selectedDate}
          />

          <button type="button" className="money-text-action" onClick={onViewDetails}>
            <span>Xem chi tiết mục tiêu</span>
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </>
      )}
    </section>
  );
}
