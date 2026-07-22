import { formatMoney } from "../../../../utils/money";

export function formatSignedMoney(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatMoney(Math.abs(value))}`;
}
