import type { Dispatch, SetStateAction } from "react";
import { ITEMS_PER_PAGE } from "../constants";
import type { ExpenseEntry, GoalScreen, Page } from "../types";
import { getExpenseTotal, getOtherExpenseItems } from "../utils/entries";
import { formatMoney } from "../utils/money";

type ExpenseQuickFilter = "today" | "7days" | "month" | "all";

type ExpensesPageProps = {
  expenseSearch: string;
  setExpenseSearch: (value: string) => void;
  expenseFromDate: string;
  setExpenseFromDate: (value: string) => void;
  expenseToDate: string;
  setExpenseToDate: (value: string) => void;
  setExpenseQuickFilter: (type: ExpenseQuickFilter) => void;
  filteredExpenses: ExpenseEntry[];
  filteredExpensesTotal: number;
  expenses: ExpenseEntry[];
  paginatedExpenses: ExpenseEntry[];
  editExpense: (expense: ExpenseEntry) => void;
  deleteExpense: (id: string) => void;
  expenseCurrentPage: number;
  setExpenseCurrentPage: Dispatch<SetStateAction<number>>;
  expenseTotalPages: number;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function ExpensesPage({
  expenseSearch,
  setExpenseSearch,
  expenseFromDate,
  setExpenseFromDate,
  expenseToDate,
  setExpenseToDate,
  setExpenseQuickFilter,
  filteredExpenses,
  filteredExpensesTotal,
  expenses,
  paginatedExpenses,
  editExpense,
  deleteExpense,
  expenseCurrentPage,
  setExpenseCurrentPage,
  expenseTotalPages,
}: ExpensesPageProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử chi tiêu</h2>
          <p className="text-sm text-slate-500">
            Xem lại chi tiêu ăn uống và các khoản khác theo ngày.
          </p>
        </div>

      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-sm font-medium">Tìm kiếm</label>
            <input
              type="text"
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              placeholder="Tìm theo ngày hoặc ghi chú chi tiêu..."
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Từ ngày</label>
            <input
              type="date"
              value={expenseFromDate}
              onChange={(e) => setExpenseFromDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Đến ngày</label>
            <input
              type="date"
              value={expenseToDate}
              onChange={(e) => setExpenseToDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <QuickFilterButton onClick={() => setExpenseQuickFilter("today")}>
            Hôm nay
          </QuickFilterButton>
          <QuickFilterButton onClick={() => setExpenseQuickFilter("7days")}>
            7 ngày
          </QuickFilterButton>
          <QuickFilterButton onClick={() => setExpenseQuickFilter("month")}>
            Tháng này
          </QuickFilterButton>
          <button
            type="button"
            onClick={() => setExpenseQuickFilter("all")}
            className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Xóa lọc
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryCard label="Số bản ghi" value={String(filteredExpenses.length)} />
        <SummaryCard
          label="Tổng chi tiêu"
          value={formatMoney(filteredExpensesTotal)}
        />
        <SummaryCard
          label="Trung bình / bản ghi"
          value={formatMoney(
            filteredExpenses.length > 0
              ? Math.round(filteredExpensesTotal / filteredExpenses.length)
              : 0
          )}
        />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        {expenses.length === 0 ? (
          <p className="text-slate-500">Chưa có dữ liệu chi tiêu nào.</p>
        ) : (
          <div className="grid gap-3">
            {paginatedExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onEdit={() => editExpense(expense)}
                onDelete={() => deleteExpense(expense.id)}
              />
            ))}
          </div>
        )}

        {filteredExpenses.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                setExpenseCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={expenseCurrentPage === 1}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>

            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium">
              Trang {expenseCurrentPage} / {expenseTotalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setExpenseCurrentPage((prev) =>
                  Math.min(prev + 1, expenseTotalPages)
                )
              }
              disabled={expenseCurrentPage === expenseTotalPages}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function QuickFilterButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: ExpenseEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const total = getExpenseTotal(expense);
  const otherItems = getOtherExpenseItems(expense);

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{expense.date}</h3>
          <p className="text-sm text-slate-500">
            Tổng chi tiêu: {formatMoney(total)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Sửa
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Xóa
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ExpenseValue label="Ăn sáng" value={formatMoney(expense.breakfast)} />
        <ExpenseValue label="Ăn trưa" value={formatMoney(expense.lunch)} />
        <ExpenseValue label="Ăn tối" value={formatMoney(expense.dinner)} />
        <ExpenseValue label="Khác" value={formatMoney(expense.other)} />
      </div>

      {otherItems.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-bold text-slate-700">Chi tiết khoản khác</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {otherItems.map((item) => (
              <p
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
              >
                <span className="text-slate-600">{item.label}</span>
                <strong>{formatMoney(item.amount)}</strong>
              </p>
            ))}
          </div>
        </div>
      )}

      {expense.note && (
        <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {expense.note}
        </p>
      )}
    </article>
  );
}

function ExpenseValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
