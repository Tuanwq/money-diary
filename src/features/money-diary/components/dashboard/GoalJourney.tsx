import { Check } from "lucide-react";

type GoalJourneyProps = {
  progress: number;
};

const milestones = [0, 25, 50, 75, 100];

export function GoalJourney({ progress }: GoalJourneyProps) {
  const nextMilestone = milestones.find((milestone) => milestone > progress) ?? 100;

  return (
    <section className="money-card money-goal-journey" aria-labelledby="goal-journey-title">
      <div className="money-section-heading">
        <div>
          <h2 id="goal-journey-title">Hành trình mục tiêu</h2>
          <p>
            {progress >= 100
              ? "Mục tiêu đã hoàn thành."
              : `Bạn đang tiến tới mốc ${nextMilestone}%.`}
          </p>
        </div>
      </div>

      <div className="money-journey-track" aria-label="Các mốc tiến độ mục tiêu">
        <span className="money-journey-line" aria-hidden="true">
          <span style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
        </span>
        {milestones.map((milestone) => {
          const achieved = progress >= milestone;
          const active = !achieved && milestone === nextMilestone;
          const label = milestone === 0 ? "Bắt đầu" : milestone === 100 ? "Hoàn thành" : `${milestone}%`;

          return (
            <div
              key={milestone}
              className={`money-journey-milestone ${achieved ? "is-achieved" : ""} ${active ? "is-active" : ""}`}
            >
              <span className="money-journey-dot" aria-hidden="true">
                {achieved ? <Check size={14} /> : null}
              </span>
              <strong>{label}</strong>
              <small>{achieved ? "Đã đạt" : active ? "Đang tiến tới" : "Chưa đạt"}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
