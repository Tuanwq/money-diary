import { Banknote, Cloud, Database } from "lucide-react";

type HubDailySummaryProps = {
  todayIncome: string;
  totalGross: string;
  cloudStatus: string;
};

export function HubDailySummary({
  todayIncome,
  totalGross,
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
        <Database size={18} aria-hidden="true" />
        <div>
          <span>Tổng ca đã lưu</span>
          <strong className="money-value">{totalGross}</strong>
        </div>
      </div>
      <div className="hub-daily-summary__item">
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
