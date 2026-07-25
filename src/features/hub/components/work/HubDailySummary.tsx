import {
  BadgeDollarSign,
  Banknote,
  Cloud,
  Database,
  WalletCards,
} from "lucide-react";

type HubDailySummaryProps = {
  todayIncome: string;
  todayProfit: string;
  todayProfitNegative: boolean;
  totalGross: string;
  totalProfit: string;
  totalProfitNegative: boolean;
  cloudStatus: string;
};

export function HubDailySummary({
  todayIncome,
  todayProfit,
  todayProfitNegative,
  totalGross,
  totalProfit,
  totalProfitNegative,
  cloudStatus,
}: HubDailySummaryProps) {
  const cloudTone = cloudStatus.toLocaleLowerCase("vi").includes("đồng bộ")
    ? "is-success"
    : "is-neutral";

  return (
    <section className="hub-daily-summary" aria-label="Tổng quan Hub">
      <div className="hub-daily-summary__item">
        <Banknote size={18} aria-hidden="true" />
        <div>
          <span>Tạm tính được hôm nay</span>
          <strong className="money-value">{todayIncome}</strong>
        </div>
      </div>
      <div className="hub-daily-summary__item">
        <BadgeDollarSign size={18} aria-hidden="true" />
        <div>
          <span>Lợi nhuận thực hôm nay</span>
          <strong
            className={`money-value ${
              todayProfitNegative ? "is-loss" : "is-profit"
            }`}
          >
            {todayProfit}
          </strong>
        </div>
      </div>
      <div className="hub-daily-summary__item">
        <Database size={18} aria-hidden="true" />
        <div>
          <span>Tổng ca đã lưu</span>
          <strong className="money-value">{totalGross}</strong>
        </div>
      </div>
      <div className="hub-daily-summary__item">
        <WalletCards size={18} aria-hidden="true" />
        <div>
          <span>Tổng lợi nhuận thực</span>
          <strong
            className={`money-value ${
              totalProfitNegative ? "is-loss" : "is-profit"
            }`}
          >
            {totalProfit}
          </strong>
        </div>
      </div>
      <div className="hub-daily-summary__item hub-daily-summary__item--cloud">
        <Cloud size={18} aria-hidden="true" />
        <div>
          <span>Trạng thái kết nối Hub</span>
          <strong className={`hub-daily-summary__status ${cloudTone}`}>
            {cloudStatus}
          </strong>
        </div>
      </div>
    </section>
  );
}
