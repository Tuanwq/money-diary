import { formatMoney } from "../../../../utils/money";

type TodayIncomeBreakdownProps = {
  bonus: number;
  expense: number;
  income: number;
  received: number;
};

export function TodayIncomeBreakdown({
  bonus,
  expense,
  income,
  received,
}: TodayIncomeBreakdownProps) {
  return (
    <div className="money-income-breakdown" aria-label="Chi tiết tiền trong ngày">
      <span>Làm <strong>{formatMoney(income)}</strong></span>
      <span>Thưởng <strong>{formatMoney(bonus)}</strong></span>
      <span>Chi <strong className="is-expense">−{formatMoney(Math.abs(expense))}</strong></span>
      <span>Nhận <strong>{formatMoney(received)}</strong></span>
    </div>
  );
}
