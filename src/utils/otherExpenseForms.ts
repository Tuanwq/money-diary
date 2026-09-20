import { parseMoneyInput } from "./money";

export type OtherExpenseItemForm = {
  id: string;
  amount: string;
  label: string;
  purpose: "daily_expense" | "goal_allocation";
};

export function createOtherExpenseItemForm(
  amount = "",
  label = "",
  purpose: OtherExpenseItemForm["purpose"] = "daily_expense"
): OtherExpenseItemForm {
  return {
    id: crypto.randomUUID(),
    amount,
    label,
    purpose,
  };
}

export function getOtherExpenseItemsTotal(items: OtherExpenseItemForm[]) {
  return items.reduce((sum, item) => sum + parseMoneyInput(item.amount), 0);
}
