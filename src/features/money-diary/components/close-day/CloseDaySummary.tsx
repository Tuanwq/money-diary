import { formatReportDate } from "../../../../utils/date";
import { formatMoney } from "../../../../utils/money";
import { formatSignedMoney } from "./formatCloseDayMoney";

type CloseDaySummaryProps = {
  date: string;
  expenseTotal: number;
  incomeTotal: number;
  netMoney: number;
};

export function CloseDaySummary({
  date,
  expenseTotal,
  incomeTotal,
  netMoney,
}: CloseDaySummaryProps) {
  const netTone = netMoney > 0 ? "positive" : netMoney < 0 ? "negative" : "neutral";

  return (
    <section className="close-day-summary" aria-label="Tóm tắt ngày đang chốt">
      <SummaryItem label="Thu nhập" value={formatMoney(incomeTotal)} />
      <SummaryItem label="Chi tiêu" value={formatMoney(expenseTotal)} />
      <SummaryItem
        emphasis
        label="Ròng"
        tone={netTone}
        value={formatSignedMoney(netMoney)}
      />
      <SummaryItem
        label="Ngày đang chốt"
        value={date ? formatReportDate(date) : "Chưa chọn"}
      />
    </section>
  );
}

function SummaryItem({
  emphasis = false,
  label,
  tone = "neutral",
  value,
}: {
  emphasis?: boolean;
  label: string;
  tone?: "negative" | "neutral" | "positive";
  value: string;
}) {
  return (
    <div
      className={`close-day-summary__item${emphasis ? " is-emphasized" : ""}`}
      data-tone={tone}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
