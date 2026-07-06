import type { Dispatch, FormEvent, SetStateAction } from "react";
import { OtherExpenseItemsInput } from "../components/OtherExpenseItemsInput";
import type { GoalScreen, Mood, Page } from "../types";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/money";
import {
  getOtherExpenseItemsTotal,
  type OtherExpenseItemForm,
} from "../utils/otherExpenseForms";

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

type CloseDayPageProps = {
  form: CloseDayForm;
  setForm: Dispatch<SetStateAction<CloseDayForm>>;
  onDateChange: (date: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  todayString: string;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function CloseDayPage({
  form,
  setForm,
  onDateChange,
  onSubmit,
  todayString,
  navigateTo,
}: CloseDayPageProps) {
  const expenseTotal =
    form.expenseMode === "total"
      ? parseMoneyInput(form.expenseTotal)
      : parseMoneyInput(form.breakfast) +
        parseMoneyInput(form.lunch) +
        parseMoneyInput(form.dinner) +
        getOtherExpenseItemsTotal(form.otherItems);

  const netMoney =
    parseMoneyInput(form.income) +
    parseMoneyInput(form.bonusMoney) +
    parseMoneyInput(form.receivedMoney) -
    expenseTotal;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Chốt ngày</h2>
          <p className="text-sm text-slate-500">
            Nhập nhanh cuối ngày bằng các thông tin quan trọng nhất.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("entry")}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Form đầy đủ
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Ngày</label>
            <input
              type="date"
              value={form.date}
              max={todayString}
              onChange={(event) => onDateChange(event.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tâm trạng</label>
            <select
              value={form.mood}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  mood: event.target.value as Mood,
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value="good">Vui</option>
              <option value="normal">Bình thường</option>
              <option value="tired">Mệt</option>
              <option value="bad">Tệ</option>
            </select>
          </div>

          <MoneyInput
            label="Tiền làm được"
            value={form.income}
            placeholder="VD: 250.000"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, income: value }))
            }
          />

          <MoneyInput
            label="Tiền thưởng"
            value={form.bonusMoney}
            placeholder="VD: 100.000"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, bonusMoney: value }))
            }
          />

          <MoneyInput
            label="Tiền nhận"
            value={form.receivedMoney}
            placeholder="VD: 500.000"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, receivedMoney: value }))
            }
          />

          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-sm text-slate-500">Tạm tính ròng</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(netMoney)}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm font-medium">Chi tiêu</label>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <ModeButton
                active={form.expenseMode === "total"}
                onClick={() =>
                  setForm((prev) => ({ ...prev, expenseMode: "total" }))
                }
              >
                Tổng
              </ModeButton>
              <ModeButton
                active={form.expenseMode === "meals"}
                onClick={() =>
                  setForm((prev) => ({ ...prev, expenseMode: "meals" }))
                }
              >
                Từng bữa
              </ModeButton>
            </div>
          </div>

          {form.expenseMode === "total" ? (
            <div className="mt-3">
              <MoneyInput
                label="Tổng chi tiêu"
                value={form.expenseTotal}
                placeholder="VD: 120.000"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, expenseTotal: value }))
                }
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <MoneyInput
                label="Ăn sáng"
                value={form.breakfast}
                placeholder="VD: 30.000"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, breakfast: value }))
                }
              />
              <MoneyInput
                label="Ăn trưa"
                value={form.lunch}
                placeholder="VD: 50.000"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, lunch: value }))
                }
              />
              <MoneyInput
                label="Ăn tối"
                value={form.dinner}
                placeholder="VD: 40.000"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, dinner: value }))
                }
              />
              <OtherExpenseItemsInput
                items={form.otherItems}
                onChange={(otherItems) =>
                  setForm((prev) => ({ ...prev, otherItems }))
                }
              />
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium">Ghi chú ngắn</label>
          <textarea
            rows={3}
            value={form.note}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, note: event.target.value }))
            }
            placeholder="VD: Hôm nay chạy ổn, tối hơi mệt..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          Lưu chốt ngày
        </button>
      </form>
    </>
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
        onChange={(event) => onChange(formatMoneyInput(event.target.value))}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1 text-sm font-medium ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
