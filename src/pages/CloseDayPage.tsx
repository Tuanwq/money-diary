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
  const incomeTotal =
    parseMoneyInput(form.income) +
    parseMoneyInput(form.bonusMoney) +
    parseMoneyInput(form.receivedMoney);
  const netMoneyTone = netMoney < 0 ? "text-red-600" : "text-emerald-700";

  return (
    <section className="grid gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-700 p-4 text-white shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-100">
              Mobile-first
            </p>
            <h2 className="mt-1 text-2xl font-bold">Chốt ngày</h2>
            <p className="mt-1 text-sm text-emerald-50">
              Nhập nhanh thu nhập, chi tiêu, ghi chú và tâm trạng cuối ngày.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo("entry")}
            className="min-h-11 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/25"
          >
            Form đầy đủ
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile label="Thu nhập" value={formatMoney(incomeTotal)} />
          <SummaryTile label="Chi tiêu" value={formatMoney(expenseTotal)} />
          <SummaryTile label="Ngày" value={form.date} />
          <SummaryTile label="Ròng" value={formatMoney(netMoney)} strong />
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <section className="app-card rounded-2xl p-4 sm:p-5">
          <SectionHeading
            title="Thông tin ngày"
            description="Chọn ngày và trạng thái hôm nay."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Ngày</label>
              <input
                type="date"
                value={form.date}
                max={todayString}
                onChange={(event) => onDateChange(event.target.value)}
                className="app-input mt-1 w-full rounded-xl border px-3 py-2"
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
                className="app-input mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option value="good">Vui</option>
                <option value="normal">Bình thường</option>
                <option value="tired">Mệt</option>
                <option value="bad">Tệ</option>
              </select>
            </div>
          </div>
        </section>

        <section className="app-card rounded-2xl p-4 sm:p-5">
          <SectionHeading
            title="Thu nhập"
            description="Ghi tiền làm được, thưởng và tiền thực nhận."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
          </div>
        </section>

        <section className="app-card rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              title="Chi tiêu"
              description="Nhập tổng chi hoặc tách rõ từng bữa/khoản khác."
            />

            <div className="flex rounded-xl bg-emerald-50 p-1">
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
            <div className="mt-4">
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
        </section>

        <section className="app-card rounded-2xl p-4 sm:p-5">
          <SectionHeading
            title="Ghi chú"
            description="Ghi ngắn những gì đáng nhớ trong ngày."
          />

          <textarea
            rows={3}
            value={form.note}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, note: event.target.value }))
            }
            placeholder="VD: Hôm nay chạy ổn, tối hơi mệt..."
            className="app-input mt-4 min-h-28 w-full rounded-xl border px-3 py-2"
          />
        </section>

        <div className="app-sticky-submit rounded-2xl p-3 sm:flex sm:items-center sm:justify-between">
          <div className="mb-3 sm:mb-0">
            <p className="text-xs font-bold tracking-wide text-slate-500">
              Tạm tính ròng
            </p>
            <p className={`text-xl font-bold ${netMoneyTone}`}>
              {formatMoney(netMoney)}
            </p>
          </div>

          <button
            type="submit"
            className="app-primary-button w-full rounded-xl px-5 py-3 font-bold sm:w-fit"
          >
            Lưu chốt ngày
          </button>
        </div>
      </form>
    </section>
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
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SummaryTile({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/20">
      <p className="text-xs font-bold tracking-wide text-emerald-100">
        {label}
      </p>
      <p
        className={`mt-1 break-words ${
          strong ? "text-xl font-bold" : "text-sm font-bold"
        }`}
      >
        {value}
      </p>
    </div>
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
        className="app-input mt-1 w-full rounded-xl border px-3 py-2"
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
        active ? "bg-white text-emerald-800 shadow-sm" : "text-emerald-800/70"
      }`}
    >
      {children}
    </button>
  );
}
