import { parseMoneyInput } from "./money";

export type OtherExpenseItemForm = {
  id: string;
  amount: string;
  label: string;
};

export function createOtherExpenseItemForm(
  amount = "",
  label = ""
): OtherExpenseItemForm {
  return {
    id: crypto.randomUUID(),
    amount,
    label,
  };
}

export function getOtherExpenseItemsTotal(items: OtherExpenseItemForm[]) {
  return items.reduce((sum, item) => sum + parseMoneyInput(item.amount), 0);
}
