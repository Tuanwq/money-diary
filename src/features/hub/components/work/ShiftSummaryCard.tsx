import { ChevronDown, ReceiptText } from "lucide-react";
import { HUB_TYPE_LABEL } from "../../../../constants/hanoiHub";
import type { HubType } from "../../../../types/hub";
import { formatMoney } from "../../../../utils/money";
import { HubSectionHeading } from "./HubSectionHeading";
import type { HubIncomePreview } from "./types";

type ShiftSummaryCardProps = {
  income: HubIncomePreview;
  hubType: HubType;
  orderCount: number;
  workHours: number;
  operatingCost: number;
  actualProfit: number;
  showDetails: boolean;
  onToggleDetails: () => void;
};

const DETAIL_ITEMS: Array<{
  label: string;
  key: keyof HubIncomePreview;
  signed?: boolean;
}> = [
  { label: "Đơn lẻ còn lại", key: "singleOrderIncome" },
  { label: "Đơn ghép", key: "joinOrderIncome" },
  { label: "Đơn vượt mốc", key: "extraOrderReward" },
  { label: "Ghép vượt mốc", key: "extraJoinOrderReward" },
  { label: "Thưởng Chủ nhật", key: "sundayReward" },
  { label: "Thưởng khu vực", key: "weekdayRegionReward" },
  { label: "Tiền làm được", key: "workIncome" },
  { label: "Chênh lệch do ghép", key: "joinDifference", signed: true },
];

export function ShiftSummaryCard({
  income,
  hubType,
  orderCount,
  workHours,
  operatingCost,
  actualProfit,
  showDetails,
  onToggleDetails,
}: ShiftSummaryCardProps) {
  const reward =
    income.extraOrderReward +
    income.extraJoinOrderReward +
    income.sundayReward +
    income.weekdayRegionReward;

  return (
    <section className="hub-form-section hub-shift-summary">
      <HubSectionHeading
        icon={ReceiptText}
        title="Tạm tính ca"
        description={`${orderCount} đơn · ${workHours} giờ · ${HUB_TYPE_LABEL[hubType]}`}
      />

      <div className="hub-shift-summary__equation" aria-label="Cách tính tổng thu nhập ca">
        <span>Tiền ca <strong>{formatMoney(income.basePrice)}</strong></span>
        <span>Thưởng <strong>{formatMoney(reward)}</strong></span>
        <span>Thu nhập khác <strong>{formatMoney(income.extraIncome)}</strong></span>
        <span>Chi phí <strong>−{formatMoney(operatingCost)}</strong></span>
      </div>

      <div className="hub-shift-summary__gross">
        <span>Tổng thu nhập ca</span>
        <strong className="money-value">{formatMoney(income.total)}</strong>
      </div>
      <div className="hub-shift-summary__total">
        <span>Lợi nhuận thực</span>
        <strong
          className={`money-value${actualProfit < 0 ? " is-negative" : ""}`}
        >
          {formatMoney(actualProfit)}
        </strong>
      </div>

      <button
        type="button"
        className="hub-shift-summary__details-button"
        aria-expanded={showDetails}
        onClick={onToggleDetails}
      >
        {showDetails ? "Thu gọn chi tiết" : "Xem chi tiết"}
        <ChevronDown
          size={17}
          className={showDetails ? "is-open" : ""}
          aria-hidden="true"
        />
      </button>

      {showDetails && (
        <dl className="hub-shift-summary__details">
          {DETAIL_ITEMS.map((item) => {
            const value = income[item.key];
            const displayValue = item.signed && value > 0 ? `+${formatMoney(value)}` : formatMoney(value);

            return (
              <div key={item.key}>
                <dt>{item.label}</dt>
                <dd className="money-value">{displayValue}</dd>
              </div>
            );
          })}
          <div>
            <dt>Chi phí vận hành</dt>
            <dd className="money-value">−{formatMoney(operatingCost)}</dd>
          </div>
          <div>
            <dt>Lợi nhuận thực</dt>
            <dd className="money-value">{formatMoney(actualProfit)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
