import { ArrowRight, CalendarDays, CircleDollarSign, Target, TrendingUp } from "lucide-react";
import type { MainGoalProgressSummary } from "../../../goals/domain/mainGoalProgress.ts";
import { formatMoney } from "../../../../utils/money";
import "./MainGoalCard.css";

type MainGoalCardProps = {
  name: string;
  onOpenGoals: () => void;
  summary: MainGoalProgressSummary;
};

export function MainGoalCard({ name, onOpenGoals, summary }: MainGoalCardProps) {
  if (summary.targetAmount <= 0) {
    return (
      <section className="money-card manager-main-goal is-empty">
        <span className="manager-main-goal__eyebrow"><Target size={16} /> Mục tiêu chính</span>
        <h2>Chưa thiết lập mục tiêu</h2>
        <p>Đặt số tiền và thời hạn để theo dõi thu nhập ròng cần đạt mỗi ngày.</p>
        <button className="money-primary-action" onClick={onOpenGoals} type="button">
          Thiết lập mục tiêu <ArrowRight size={17} />
        </button>
      </section>
    );
  }

  return (
    <section className="money-card manager-main-goal" aria-labelledby="manager-main-goal-title">
      <header className="manager-main-goal__header">
        <div>
          <span className="manager-main-goal__eyebrow"><Target size={16} /> Mục tiêu chính</span>
          <h2 id="manager-main-goal-title">{name || "Mục tiêu chưa đặt tên"}</h2>
        </div>
        <strong className="manager-main-goal__percent">{summary.progress}%</strong>
      </header>

      <div className="manager-main-goal__amount">
        <strong>{formatMoney(summary.goalNetAmount)}</strong>
        <span>trên {formatMoney(summary.targetAmount)}</span>
      </div>

      <div className="manager-main-goal__progress" role="progressbar"
        aria-label={`Tiến độ mục tiêu ${name}`} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={summary.progress}>
        <span style={{ width: `${summary.progress}%` }} />
      </div>

      <div className="manager-main-goal__metrics">
        <div><span>Còn thiếu</span><strong>{formatMoney(summary.remainingAmount)}</strong></div>
        <div><span><CalendarDays size={14} /> Còn lại</span><strong>{summary.remainingDays} ngày</strong></div>
        <div className="is-emphasis"><span><TrendingUp size={14} /> Cần thêm mỗi ngày</span>
          <strong>{formatMoney(summary.requiredPerDay)}</strong></div>
      </div>

      <div className="manager-main-goal__breakdown" aria-label="Cách tính tiến độ mục tiêu">
        <div><span>Tổng thu trong kỳ</span><strong>+{formatMoney(summary.goalIncome)}</strong></div>
        <div><span>Chi phí thường ngày</span><strong>−{formatMoney(summary.goalExpenses)}</strong></div>
        <div><span><CircleDollarSign size={14} /> Thu nhập ròng</span>
          <strong>{formatMoney(summary.goalNetAmount)}</strong></div>
      </div>

      {summary.unclassifiedTransactions > 0 && (
        <p className="manager-main-goal__notice">
          {summary.unclassifiedTransactions} giao dịch cũ chưa có mục đích nên chưa được tính vào tiến độ.
        </p>
      )}

      <footer className="manager-main-goal__footer">
        <small>Phân bổ mục tiêu và chuyển nội bộ không làm giảm tiến độ.</small>
        <button className="money-text-action" onClick={onOpenGoals} type="button">
          Xem chi tiết <ArrowRight size={17} />
        </button>
      </footer>
    </section>
  );
}
