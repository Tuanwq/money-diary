import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { OtherExpenseItemsInput } from "../components/OtherExpenseItemsInput";
import type { GoalScreen, Mood, Page } from "../types";
import { getToday } from "../utils/date";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/money";
import {
  getOtherExpenseItemsTotal,
  type OtherExpenseItemForm,
} from "../utils/otherExpenseForms";

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

type EntryPageProps = {
  editingDate: string | null;
  editingExpenseDate: string | null;
  form: DailyEntryForm;
  setForm: Dispatch<SetStateAction<DailyEntryForm>>;
  expenseForm: ExpenseEntryForm;
  setExpenseForm: Dispatch<SetStateAction<ExpenseEntryForm>>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleExpenseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setEditingDate: (date: string | null) => void;
  setEditingExpenseDate: (date: string | null) => void;
  todayString: string;
  renderBalanceCheckCard: (title?: string) => ReactNode;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function EntryPage({
  editingDate,
  editingExpenseDate,
  form,
  setForm,
  expenseForm,
  setExpenseForm,
  handleSubmit,
  handleExpenseSubmit,
  setEditingDate,
  setEditingExpenseDate,
  todayString,
}: EntryPageProps) {
  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-700 p-4 text-white shadow-sm sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">
            Form đầy đủ
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {editingDate ? "Sửa nhật kí" : "Ghi nhật kí"}
          </h2>
          <p className="mt-1 text-sm text-emerald-50">
            Ghi chi tiết chi tiêu, thu nhập, đơn, giờ làm và ghi chú.
          </p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <ExpenseForm
          editingExpenseDate={editingExpenseDate}
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          handleExpenseSubmit={handleExpenseSubmit}
          setEditingExpenseDate={setEditingExpenseDate}
          todayString={todayString}
        />

        <DiaryForm
          editingDate={editingDate}
          form={form}
          setForm={setForm}
          handleSubmit={handleSubmit}
          setEditingDate={setEditingDate}
        />

      </section>
    </>
  );
}

function ExpenseForm({
  editingExpenseDate,
  expenseForm,
  setExpenseForm,
  handleExpenseSubmit,
  setEditingExpenseDate,
  todayString,
}: {
  editingExpenseDate: string | null;
  expenseForm: ExpenseEntryForm;
  setExpenseForm: Dispatch<SetStateAction<ExpenseEntryForm>>;
  handleExpenseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setEditingExpenseDate: (date: string | null) => void;
  todayString: string;
}) {
  const draftTotal =
    parseMoneyInput(expenseForm.breakfast) +
    parseMoneyInput(expenseForm.lunch) +
    parseMoneyInput(expenseForm.dinner) +
    getOtherExpenseItemsTotal(expenseForm.otherItems);

  return (
    <form
      onSubmit={handleExpenseSubmit}
      className="app-card rounded-2xl p-4 shadow-sm sm:p-5"
    >
      <SectionHeading
        title={editingExpenseDate ? "Sửa chi tiêu" : "Chi tiêu hôm nay"}
        description="Nhập chi tiêu ăn uống và các khoản phát sinh trong ngày."
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Ngày</label>
          <input
            type="date"
            value={expenseForm.date}
            max={todayString}
            onChange={(e) =>
              setExpenseForm((prev) => ({ ...prev, date: e.target.value }))
            }
            className="app-input mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <MoneyInput
          label="Ăn sáng"
          value={expenseForm.breakfast}
          placeholder="VD: 30.000"
          onChange={(value) =>
            setExpenseForm((prev) => ({ ...prev, breakfast: value }))
          }
        />
        <MoneyInput
          label="Ăn trưa"
          value={expenseForm.lunch}
          placeholder="VD: 50.000"
          onChange={(value) =>
            setExpenseForm((prev) => ({ ...prev, lunch: value }))
          }
        />
        <MoneyInput
          label="Ăn tối"
          value={expenseForm.dinner}
          placeholder="VD: 40.000"
          onChange={(value) =>
            setExpenseForm((prev) => ({ ...prev, dinner: value }))
          }
        />
        <OtherExpenseItemsInput
          items={expenseForm.otherItems}
          onChange={(otherItems) =>
            setExpenseForm((prev) => ({ ...prev, otherItems }))
          }
        />

        <div className="app-soft-card rounded-xl p-3 text-sm">
          <p className="text-emerald-800">Tổng chi tiêu đang nhập</p>
          <p className="mt-1 text-lg font-black text-emerald-900">
            {formatMoney(draftTotal)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium">Ghi chú chi tiêu</label>
        <textarea
          rows={3}
          value={expenseForm.note}
          onChange={(e) =>
            setExpenseForm((prev) => ({ ...prev, note: e.target.value }))
          }
          placeholder="VD: Ăn trưa với bạn, mua nước, gửi xe..."
          className="app-input mt-1 min-h-28 w-full rounded-xl border px-3 py-2"
        />
      </div>

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="submit"
          className="app-primary-button rounded-xl px-5 py-2 font-bold sm:w-fit"
        >
          {editingExpenseDate ? "Cập nhật chi tiêu" : "Lưu chi tiêu"}
        </button>

        {editingExpenseDate && (
          <button
            type="button"
            onClick={() => {
              setEditingExpenseDate(null);
              setExpenseForm({
                date: getToday(),
                breakfast: "",
                lunch: "",
                dinner: "",
                otherItems: [],
                note: "",
              });
            }}
            className="app-secondary-button rounded-xl px-5 py-2 font-medium"
          >
            Hủy sửa
          </button>
        )}
      </div>
    </form>
  );
}

function DiaryForm({
  editingDate,
  form,
  setForm,
  handleSubmit,
  setEditingDate,
}: {
  editingDate: string | null;
  form: DailyEntryForm;
  setForm: Dispatch<SetStateAction<DailyEntryForm>>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setEditingDate: (date: string | null) => void;
}) {
  return (
    <form
      onSubmit={handleSubmit}
      className="app-card rounded-2xl p-4 shadow-sm sm:p-5"
    >
      <SectionHeading
        title={
          editingDate ? `Sửa nhật ký ngày ${editingDate}` : "Ghi nhật ký hôm nay"
        }
        description="Ghi lại tiền, số đơn, giờ làm và cảm nhận trong ngày."
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Ngày</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, date: e.target.value }))
            }
            className="app-input mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Tâm trạng</label>
          <select
            value={form.mood}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                mood: e.target.value as Mood,
              }))
            }
            className="app-input mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="good">Vui</option>
            <option value="normal">Bình thường</option>
            <option value="tired">Mệt</option>
            <option value="bad">Tệ</option>
          </select>
        </div>

        <MoneyInput
          label="Tiền kiếm được"
          value={form.income}
          placeholder="VD: 250.000"
          onChange={(value) => setForm((prev) => ({ ...prev, income: value }))}
        />

        <NumberInput
          label="Tiền nhận được"
          value={form.receivedMoney}
          placeholder="VD: 800000"
          onChange={(value) =>
            setForm((prev) => ({ ...prev, receivedMoney: value }))
          }
        />

        <NumberInput
          label="Tiền thưởng"
          value={form.bonusMoney}
          placeholder="VD: 100000"
          onChange={(value) =>
            setForm((prev) => ({ ...prev, bonusMoney: value }))
          }
        />

        <div>
          <label className="text-sm font-medium">Số lượng đơn</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="VD: 12"
            value={form.orderCount}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/[^\d]/g, "");
              setForm((prev) => ({ ...prev, orderCount: onlyDigits }));
            }}
            className="app-input mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <NumberInput
          label="Số giờ làm việc"
          value={form.workHours}
          placeholder="VD: 4"
          step="0.5"
          onChange={(value) =>
            setForm((prev) => ({ ...prev, workHours: value }))
          }
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium">Hôm nay mình đã làm gì?</label>
        <textarea
          rows={4}
          value={form.diary}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, diary: e.target.value }))
          }
          placeholder="VD: Hôm nay chạy đơn buổi sáng, hơi mệt nhưng vẫn cố hoàn thành..."
          className="app-input mt-1 min-h-32 w-full rounded-xl border px-3 py-2"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium">Ghi chú thêm</label>
        <textarea
          rows={3}
          value={form.note}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, note: e.target.value }))
          }
          placeholder="VD: Mai cần dậy sớm hơn, tối ưu khung giờ làm việc..."
          className="app-input mt-1 min-h-28 w-full rounded-xl border px-3 py-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="app-primary-button w-full rounded-xl px-5 py-2 font-bold sm:w-fit"
        >
          {editingDate ? "Cập nhật nhật ký" : "Lưu nhật ký"}
        </button>

        {editingDate && (
          <button
            type="button"
            onClick={() => {
              setEditingDate(null);
              setForm({
                date: getToday(),
                diary: "",
                income: "",
                receivedMoney: "",
                bonusMoney: "",
                orderCount: "",
                workHours: "",
                mood: "normal",
                note: "",
              });
            }}
            className="app-secondary-button w-full rounded-xl px-5 py-2 font-medium sm:w-fit"
          >
            Hủy sửa
          </button>
        )}
      </div>
    </form>
  );
}

function MoneyInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(formatMoneyInput(e.target.value))}
        className="app-input mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  placeholder,
  step,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="app-input mt-1 w-full rounded-xl border px-3 py-2"
      />
      <p className="mt-1 text-xs text-slate-500" />
    </div>
  );
}

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
