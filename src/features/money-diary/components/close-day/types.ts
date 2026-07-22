import type { Dispatch, SetStateAction } from "react";
import type { Mood } from "../../../../types";
import type { OtherExpenseItemForm } from "../../../../utils/otherExpenseForms";

export type CloseDayForm = {
  date: string;
  income: string;
  bonusMoney: string;
  receivedMoney: string;
  expenseMode: "total" | "meals";
  expenseTotal: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  otherItems: OtherExpenseItemForm[];
  note: string;
  mood: Mood;
};

export type CloseDayFormSetter = Dispatch<SetStateAction<CloseDayForm>>;
