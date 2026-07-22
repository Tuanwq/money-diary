import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Mood } from "../../../../types";
import type { OtherExpenseItemForm } from "../../../../utils/otherExpenseForms";

export type DailyEntryForm = {
  date: string;
  diary: string;
  income: string;
  receivedMoney: string;
  bonusMoney: string;
  orderCount: string;
  workHours: string;
  mood: Mood;
  note: string;
};

export type ExpenseEntryForm = {
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  otherItems: OtherExpenseItemForm[];
  note: string;
};

export type DailyJournalFormProps = {
  editingDate: string | null;
  form: DailyEntryForm;
  setForm: Dispatch<SetStateAction<DailyEntryForm>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
};

export type ExpenseJournalFormProps = {
  editingExpenseDate: string | null;
  form: ExpenseEntryForm;
  setForm: Dispatch<SetStateAction<ExpenseEntryForm>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  todayString: string;
};

export type DetailedJournalTab = "expense" | "journal";
