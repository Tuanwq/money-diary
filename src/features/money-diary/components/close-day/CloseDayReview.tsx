import { Calculator, CircleAlert } from "lucide-react";
import { formatMoney } from "../../../../utils/money";
import { CloseDaySectionHeading } from "./CloseDaySectionHeading";
import { formatSignedMoney } from "./formatCloseDayMoney";

type CloseDayReviewProps = {
  expenseTotal: number;
  incomeTotal: number;
  missingItems: string[];
  netMoney: number;
};

export function CloseDayReview({
  expenseTotal,
  incomeTotal,
  missingItems,
  netMoney,
}: CloseDayReviewProps) {
  const netTone = netMoney > 0 ? "positive" : netMoney < 0 ? "negative" : "neutral";

  return (
    <section className="close-day-section close-day-review">
      <CloseDaySectionHeading
        description="Kiểm tra số liệu trước khi lưu."
        icon={Calculator}
        title="Tóm tắt cuối ngày"
      />

      <dl className="close-day-review__rows">
        <div>
          <dt>Tổng thu nhập</dt>
          <dd>{formatMoney(incomeTotal)}</dd>
        </div>
        <div>
          <dt>Tổng chi tiêu</dt>
          <dd>{formatMoney(expenseTotal)}</dd>
        </div>
        <div className="close-day-review__net" data-tone={netTone}>
          <dt>Thu nhập ròng</dt>
          <dd>{formatSignedMoney(netMoney)}</dd>
        </div>
      </dl>

      <p className="close-day-review__equation">
        Thu nhập {formatMoney(incomeTotal)} − Chi tiêu {formatMoney(expenseTotal)} = Ròng{" "}
        <strong>{formatSignedMoney(netMoney)}</strong>
      </p>

      {missingItems.length > 0 && (
        <div className="close-day-review__missing" role="status">
          <CircleAlert aria-hidden="true" size={18} />
          <div>
            <strong>Dữ liệu còn thiếu</strong>
            <p>{missingItems.join(" · ")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
