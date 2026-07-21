import { ArrowRight, CircleCheck, WalletCards } from "lucide-react";
import { formatMoney } from "../../../../utils/money";

type TodayTargetCardProps = {
  earned: number;
  needed: number;
  onAction: () => void;
  target: number;
};

export function TodayTargetCard({
  earned,
  needed,
  onAction,
  target,
}: TodayTargetCardProps) {
  const achieved = needed <= 0;

  return (
    <section
      className={`money-card money-today-target-card ${achieved ? "is-achieved" : "is-warning"}`}
      aria-labelledby="today-target-title"
    >
      <div className="money-today-target-icon" aria-hidden="true">
        {achieved ? <CircleCheck size={24} /> : <WalletCards size={24} />}
      </div>
      <div className="money-today-target-copy">
        <span className="money-eyebrow">Hôm nay cần</span>
        <h2 id="today-target-title">
          {achieved ? "Bạn đã đạt nhịp hôm nay" : formatMoney(needed)}
        </h2>
        <p>Nhịp cần hôm nay: {formatMoney(target)}</p>
        <p>
          {achieved
            ? `Đã kiếm được ${formatMoney(earned)} ròng trong ngày.`
            : `Đã có ${formatMoney(earned)} trên nhịp cần ${formatMoney(target)}.`}
        </p>
      </div>
      <button type="button" className="money-primary-action" onClick={onAction}>
        <span>{achieved ? "Xem nhật ký hôm nay" : "Nhập thu nhập"}</span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </section>
  );
}
