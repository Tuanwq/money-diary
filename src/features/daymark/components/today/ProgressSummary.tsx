import { CheckCircle2, Flame } from "lucide-react";
import { ProgressBar } from "../../../../components/ProgressBar";

type ProgressSummaryProps = {
  completedCount: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  requiredCompletionRate: number;
  totalTasks: number;
};

export function ProgressSummary({
  completedCount,
  completionRate,
  currentStreak,
  longestStreak,
  requiredCompletionRate,
  totalTasks,
}: ProgressSummaryProps) {
  const hasStreak = currentStreak > 0;

  return (
    <section className="daymark-progress-summary" aria-label="Tổng quan hôm nay">
      <div className="daymark-progress-ring" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <circle className="daymark-progress-track" cx="60" cy="60" r="52" />
          <circle
            className="daymark-progress-value"
            cx="60"
            cy="60"
            r="52"
            strokeDasharray={`${completionRate * 3.267} 326.7`}
          />
        </svg>
        <div className="daymark-progress-number">{completionRate}%</div>
      </div>

      <div className="min-w-0">
        <p className="daymark-muted-label">Tiến độ hôm nay</p>
        <h2 className="mt-1 text-2xl font-black">
          {completedCount}/{totalTasks} nhiệm vụ
        </h2>
        <p className="mt-1 text-sm text-[var(--dm-muted)]">
          Duy trì chuỗi khi đạt ít nhất {requiredCompletionRate}%.
        </p>
        <div className="mt-4">
          <ProgressBar value={completionRate} />
        </div>
      </div>

      <div className="daymark-streak-pill">
        <Flame
          aria-hidden="true"
          className={hasStreak ? "text-[var(--dm-accent)]" : "text-[var(--dm-muted)]"}
          size={20}
        />
        <div>
          <p className="text-sm font-black">{currentStreak} ngày</p>
          <p className="text-xs text-[var(--dm-muted)]">Kỷ lục {longestStreak}</p>
        </div>
      </div>

      {completionRate >= requiredCompletionRate && totalTasks > 0 && (
        <div className="daymark-achieved-note">
          <CheckCircle2 aria-hidden="true" size={16} />
          <span>Hôm nay đã đủ điều kiện giữ streak.</span>
        </div>
      )}
    </section>
  );
}
