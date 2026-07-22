import type { FormEvent } from "react";
import { CloseDayActionBar } from "../features/money-diary/components/close-day/CloseDayActionBar";
import { CloseDayHeader } from "../features/money-diary/components/close-day/CloseDayHeader";
import { CloseDayReview } from "../features/money-diary/components/close-day/CloseDayReview";
import { CloseDaySummary } from "../features/money-diary/components/close-day/CloseDaySummary";
import { DayInformationSection } from "../features/money-diary/components/close-day/DayInformationSection";
import { DayNoteSection } from "../features/money-diary/components/close-day/DayNoteSection";
import { ExpenseSection } from "../features/money-diary/components/close-day/ExpenseSection";
import { IncomeSection } from "../features/money-diary/components/close-day/IncomeSection";
import type {
  CloseDayForm,
  CloseDayFormSetter,
} from "../features/money-diary/components/close-day/types";
import { parseMoneyInput } from "../utils/money";
import { getOtherExpenseItemsTotal } from "../utils/otherExpenseForms";

export type { CloseDayForm } from "../features/money-diary/components/close-day/types";

type CloseDayPageProps = {
  form: CloseDayForm;
  hasExistingData: boolean;
  onCancel?: () => void;
  onDateChange: (date: string) => void;
  onOpenDetailed: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: CloseDayFormSetter;
  todayString: string;
};

export function CloseDayPage({
  form,
  hasExistingData,
  onCancel,
  onDateChange,
  onOpenDetailed,
  onSubmit,
  setForm,
  todayString,
}: CloseDayPageProps) {
  const expenseTotal =
    form.expenseMode === "total"
      ? parseMoneyInput(form.expenseTotal)
      : parseMoneyInput(form.breakfast) +
        parseMoneyInput(form.lunch) +
        parseMoneyInput(form.dinner) +
        getOtherExpenseItemsTotal(form.otherItems);
  const incomeTotal =
    parseMoneyInput(form.income) +
    parseMoneyInput(form.bonusMoney) +
    parseMoneyInput(form.receivedMoney);
  const netMoney = incomeTotal - expenseTotal;
  const missingItems = [
    incomeTotal <= 0 ? "Chưa có thu nhập" : "",
    expenseTotal <= 0 ? "Chưa có chi tiêu" : "",
    form.note.trim() ? "" : "Chưa có ghi chú",
  ].filter(Boolean);
  const canSubmit = Boolean(
    form.date &&
      (incomeTotal > 0 ||
        expenseTotal > 0 ||
        form.note.trim() ||
        form.mood !== "normal")
  );

  return (
    <section className="close-day-page">
      <CloseDayHeader
        date={form.date}
        onOpenDetailed={onOpenDetailed}
      />
      <CloseDaySummary
        date={form.date}
        expenseTotal={expenseTotal}
        incomeTotal={incomeTotal}
        netMoney={netMoney}
      />

      <form className="close-day-form" onSubmit={onSubmit}>
        <DayInformationSection
          date={form.date}
          hasExistingData={hasExistingData}
          maxDate={todayString}
          mood={form.mood}
          onDateChange={onDateChange}
          setForm={setForm}
        />

        <div className="close-day-form__main">
          <IncomeSection form={form} setForm={setForm} />
          <ExpenseSection
            expenseTotal={expenseTotal}
            form={form}
            setForm={setForm}
          />
          <DayNoteSection
            value={form.note}
            onChange={(note) => setForm((current) => ({ ...current, note }))}
          />
        </div>

        <aside className="close-day-form__sidebar">
          <CloseDayReview
            expenseTotal={expenseTotal}
            incomeTotal={incomeTotal}
            missingItems={missingItems}
            netMoney={netMoney}
          />
        </aside>

        <CloseDayActionBar
          canSubmit={canSubmit}
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}
