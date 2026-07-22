import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  DailyJournalForm,
  DetailedJournalHeader,
  DetailedJournalTabs,
  ExpenseJournalForm,
  type DailyEntryForm,
  type DetailedJournalTab,
  type ExpenseEntryForm,
} from "../features/money-diary/components/detailed-journal";
import { parseMoneyInput } from "../utils/money";

export type { DailyEntryForm, ExpenseEntryForm };

type EntryPageProps = {
  editingDate: string | null;
  editingExpenseDate: string | null;
  form: DailyEntryForm;
  setForm: Dispatch<SetStateAction<DailyEntryForm>>;
  expenseForm: ExpenseEntryForm;
  setExpenseForm: Dispatch<SetStateAction<ExpenseEntryForm>>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleExpenseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  cancelEditEntry: () => void;
  cancelEditExpense: () => void;
  onReturnToQuickEntry?: () => void;
  todayString: string;
};

function useLockedSubmit(
  submit: (event: FormEvent<HTMLFormElement>) => void
) {
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (lockedRef.current) {
        event.preventDefault();
        return;
      }

      lockedRef.current = true;
      submit(event);
      timerRef.current = window.setTimeout(() => {
        lockedRef.current = false;
        timerRef.current = null;
      }, 700);
    },
    [submit]
  );
}

export function EntryPage({
  editingDate,
  editingExpenseDate,
  form,
  setForm,
  expenseForm,
  setExpenseForm,
  handleSubmit,
  handleExpenseSubmit,
  cancelEditEntry,
  cancelEditExpense,
  onReturnToQuickEntry,
  todayString,
}: EntryPageProps) {
  const [activeTab, setActiveTab] = useState<DetailedJournalTab>(() =>
    editingDate && !editingExpenseDate ? "journal" : "expense"
  );
  const lockedDiarySubmit = useLockedSubmit(handleSubmit);
  const lockedExpenseSubmit = useLockedSubmit(handleExpenseSubmit);
  const expenseHasData = Boolean(
    parseMoneyInput(expenseForm.breakfast) ||
      parseMoneyInput(expenseForm.lunch) ||
      parseMoneyInput(expenseForm.dinner) ||
      expenseForm.otherItems.some(
        (item) => parseMoneyInput(item.amount) > 0 || item.label.trim()
      ) ||
      expenseForm.note.trim()
  );
  const journalHasData = Boolean(
    parseMoneyInput(form.income) ||
      parseMoneyInput(form.receivedMoney) ||
      parseMoneyInput(form.bonusMoney) ||
      Number(form.orderCount) ||
      Number(form.workHours) ||
      form.diary.trim() ||
      form.note.trim()
  );

  return (
    <div className="detailed-journal-page">
      <DetailedJournalHeader
        expenseDate={expenseForm.date}
        journalDate={form.date}
        onReturnToQuickEntry={onReturnToQuickEntry}
      />

      <DetailedJournalTabs
        activeTab={activeTab}
        expenseHasData={expenseHasData}
        journalHasData={journalHasData}
        onChange={setActiveTab}
      />

      <section className="detailed-journal-layout">
        <div
          id="detailed-expense-panel"
          className={`detailed-journal-panel${activeTab === "expense" ? " is-active" : ""}`}
        >
          <ExpenseJournalForm
            editingExpenseDate={editingExpenseDate}
            form={expenseForm}
            setForm={setExpenseForm}
            onSubmit={lockedExpenseSubmit}
            onCancelEdit={cancelEditExpense}
            todayString={todayString}
          />
        </div>

        <div
          id="detailed-journal-panel"
          className={`detailed-journal-panel${activeTab === "journal" ? " is-active" : ""}`}
        >
          <DailyJournalForm
            editingDate={editingDate}
            form={form}
            setForm={setForm}
            onSubmit={lockedDiarySubmit}
            onCancelEdit={cancelEditEntry}
          />
        </div>
      </section>
    </div>
  );
}
