import type { Dispatch, SetStateAction } from "react";
import { ITEMS_PER_PAGE } from "../constants";
import type { ExpenseBudget, ExpenseEntry, GoalScreen, Page } from "../types";
import {
  buildOtherExpenseBreakdown,
  getExpenseTotal,
  getOtherExpenseItems,
} from "../utils/entries";
import { formatDateShort, getMonthStart, getToday } from "../utils/date";
import { formatMoney, formatMoneyInput } from "../utils/money";

type ExpenseQuickFilter =
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "lastMonth"
  | "all";

type ExpenseBudgetForm = {
  label: string;
  monthlyLimit: string;
};

type ExpensesPageProps = {
  expenseSearch: string;
  setExpenseSearch: (value: string) => void;
  expenseFromDate: string;
  setExpenseFromDate: (value: string) => void;
  expenseToDate: string;
  setExpenseToDate: (value: string) => void;
  expenseLabelFilter: string;
  setExpenseLabelFilter: (value: string) => void;
  expenseLabelOptions: string[];
  expenseBudgetForm: ExpenseBudgetForm;
  setExpenseBudgetForm: Dispatch<SetStateAction<ExpenseBudgetForm>>;
  editingExpenseBudgetId: string | null;
  expenseBudgets: ExpenseBudget[];
  saveExpenseBudget: () => void;
  startEditExpenseBudget: (budget: ExpenseBudget) => void;
  cancelEditExpenseBudget: () => void;
  deleteExpenseBudget: (id: string) => void;
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

type CategoryBreakdownItem = {
  label: string;
  total: number;
  percent: number;
  barClassName: string;
};

type DailyOtherBreakdownItem = {
  label: string;
  total: number;
  count: number;
};

type ExpenseBudgetRow = ExpenseBudget & {
  percent: number;
  remaining: number;
  spent: number;
};

export function ExpensesPage({
  expenseSearch,
  setExpenseSearch,
  expenseFromDate,
  setExpenseFromDate,
  expenseToDate,
  setExpenseToDate,
  expenseLabelFilter,
  setExpenseLabelFilter,
  expenseLabelOptions,
  expenseBudgetForm,
  setExpenseBudgetForm,
  editingExpenseBudgetId,
  expenseBudgets,
  saveExpenseBudget,
  startEditExpenseBudget,
  cancelEditExpenseBudget,
  deleteExpenseBudget,
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
  const dayCount = getDistinctDateCount(filteredExpenses);
  const averagePerDay =
    dayCount > 0 ? Math.round(filteredExpensesTotal / dayCount) : 0;
  const topExpense = getTopExpense(filteredExpenses);
  const otherExpenseBreakdown = buildOtherExpenseBreakdown(filteredExpenses);
  const topOtherExpense = otherExpenseBreakdown[0];
  const categoryBreakdown = buildCategoryBreakdown(
    filteredExpenses,
    filteredExpensesTotal
  );
  const otherExpenseTotal = otherExpenseBreakdown.reduce(
    (sum, item) => sum + item.total,
    0
  );
  const rangeLabel = buildRangeLabel(expenseFromDate, expenseToDate);
  const budgetLabelOptions = [
    "Ăn uống",
    ...expenseLabelOptions.filter((label) => label !== "Ăn uống"),
  ];
  const budgetRows = buildExpenseBudgetRows(expenseBudgets, expenses);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử chi tiêu</h2>
          <p className="text-sm text-slate-500">
            Xem chi tiết tiền ăn, khoản khác theo nhãn và xu hướng trong bộ lọc.
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
          {rangeLabel}
        </span>
      </div>

      <section className="app-card rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="text-sm font-medium">Tìm kiếm</label>
            <input
              type="text"
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              placeholder="Tìm theo ngày, ghi chú hoặc nhãn..."
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Nhãn khoản khác</label>
            <select
              value={expenseLabelFilter}
              onChange={(e) => setExpenseLabelFilter(e.target.value)}
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value="">Tất cả nhãn</option>
              {expenseLabelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Từ ngày</label>
            <input
              type="date"
              value={expenseFromDate}
              onChange={(e) => setExpenseFromDate(e.target.value)}
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Đến ngày</label>
            <input
              type="date"
              value={expenseToDate}
              onChange={(e) => setExpenseToDate(e.target.value)}
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
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
          <QuickFilterButton onClick={() => setExpenseQuickFilter("30days")}>
            30 ngày
          </QuickFilterButton>
          <QuickFilterButton onClick={() => setExpenseQuickFilter("month")}>
            Tháng này
          </QuickFilterButton>
          <QuickFilterButton onClick={() => setExpenseQuickFilter("lastMonth")}>
            Tháng trước
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

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <SummaryCard
          label="Số bản ghi"
          value={String(filteredExpenses.length)}
          detail={`${dayCount} ngày có chi tiêu`}
        />
        <SummaryCard
          label="Tổng chi tiêu"
          value={formatMoney(filteredExpensesTotal)}
          detail="Theo bộ lọc hiện tại"
        />
        <SummaryCard
          label="Trung bình / ngày"
          value={formatMoney(averagePerDay)}
          detail="Tính theo ngày có dữ liệu"
        />
        <SummaryCard
          label="Ngày chi cao nhất"
          value={topExpense ? formatMoney(getExpenseTotal(topExpense)) : "0 đ"}
          detail={topExpense ? formatDateShort(topExpense.date) : "Chưa có"}
        />
        <SummaryCard
          label="Nhãn khác lớn nhất"
          value={topOtherExpense ? formatMoney(topOtherExpense.total) : "0 đ"}
          detail={topOtherExpense?.label ?? "Chưa có khoản khác"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <article className="app-card rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-black">Cơ cấu chi tiêu</h3>
              <p className="text-sm text-slate-500">
                Tỷ trọng tiền ăn và khoản khác trong bộ lọc.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {categoryBreakdown.map((item) => (
              <BreakdownBar key={item.label} item={item} />
            ))}
          </div>
        </article>

        <article className="app-card rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-black">Phân tích theo nhãn</h3>
              <p className="text-sm text-slate-500">
                Các khoản khác được gom theo nhãn để biết tiền đi vào đâu.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
              {formatMoney(otherExpenseTotal)}
            </span>
          </div>

          {otherExpenseBreakdown.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              Chưa có khoản khác trong bộ lọc này.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {otherExpenseBreakdown.slice(0, 6).map((item) => (
                <OtherExpenseLabelRow
                  key={item.label}
                  count={item.count}
                  label={item.label}
                  percent={getPercent(item.total, otherExpenseTotal)}
                  total={item.total}
                />
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="app-card rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Ngân sách theo nhãn</h3>
            <p className="text-sm text-slate-500">
              Đặt hạn mức tháng cho ăn uống, xăng, điện hoặc từng nhãn khoản khác.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
            {formatDateShort(getMonthStart())} - {formatDateShort(getToday())}
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <div>
            <label className="text-sm font-medium">Nhãn ngân sách</label>
            <input
              list="expense-budget-label-options"
              value={expenseBudgetForm.label}
              onChange={(event) =>
                setExpenseBudgetForm((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
              placeholder="VD: Xăng, Ăn uống, Tiền điện"
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
            <datalist id="expense-budget-label-options">
              {budgetLabelOptions.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-sm font-medium">Hạn mức tháng</label>
            <input
              type="text"
              inputMode="numeric"
              value={expenseBudgetForm.monthlyLimit}
              onChange={(event) =>
                setExpenseBudgetForm((prev) => ({
                  ...prev,
                  monthlyLimit: formatMoneyInput(event.target.value),
                }))
              }
              placeholder="VD: 500.000"
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={saveExpenseBudget}
              className="w-full rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700 lg:w-auto"
            >
              {editingExpenseBudgetId ? "Lưu sửa" : "Thêm"}
            </button>

            {editingExpenseBudgetId && (
              <button
                type="button"
                onClick={cancelEditExpenseBudget}
                className="w-full rounded-xl border bg-white px-5 py-2 font-medium text-slate-700 hover:bg-slate-100 lg:w-auto"
              >
                Hủy
              </button>
            )}
          </div>
        </div>

        {budgetRows.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            Chưa có ngân sách nào. Thêm hạn mức để app cảnh báo khi gần vượt hoặc đã vượt.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {budgetRows.map((budget) => (
              <ExpenseBudgetCard
                key={budget.id}
                budget={budget}
                onEdit={() => startEditExpenseBudget(budget)}
                onDelete={() => deleteExpenseBudget(budget.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="app-card rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black">Danh sách chi tiết</h3>
            <p className="text-sm text-slate-500">
              Đang xem {filteredExpenses.length} / {expenses.length} bản ghi.
            </p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <p className="text-slate-500">Chưa có dữ liệu chi tiêu nào.</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            Không có bản ghi nào khớp với bộ lọc hiện tại.
          </p>
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

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="app-card rounded-2xl p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
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
  const foodTotal = expense.breakfast + expense.lunch + expense.dinner;
  const otherItems = getOtherExpenseItems(expense);
  const dailyOtherBreakdown = buildDailyOtherBreakdown(expense);
  const otherTotal =
    expense.other || dailyOtherBreakdown.reduce((sum, item) => sum + item.total, 0);

  return (
    <article className="rounded-xl border border-slate-200 p-4">
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

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ExpenseValue label="Ăn sáng" value={formatMoney(expense.breakfast)} />
        <ExpenseValue label="Ăn trưa" value={formatMoney(expense.lunch)} />
        <ExpenseValue label="Ăn tối" value={formatMoney(expense.dinner)} />
        <ExpenseValue label="Ăn uống" value={formatMoney(foodTotal)} />
        <ExpenseValue label="Khác" value={formatMoney(otherTotal)} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-bold text-slate-700">Tỷ trọng ngày này</p>
          <div className="mt-2 grid gap-2">
            <MiniRatioRow
              label="Ăn uống"
              percent={getPercent(foodTotal, total)}
              value={foodTotal}
            />
            <MiniRatioRow
              label="Khoản khác"
              percent={getPercent(otherTotal, total)}
              value={otherTotal}
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-bold text-slate-700">Khoản khác theo nhãn</p>
          {dailyOtherBreakdown.length > 0 ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {dailyOtherBreakdown.map((item) => (
                <p
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                >
                  <span className="min-w-0 text-slate-600">
                    {item.label}
                    {item.count > 1 && (
                      <span className="ml-1 text-xs text-slate-400">
                        x{item.count}
                      </span>
                    )}
                  </span>
                  <strong>{formatMoney(item.total)}</strong>
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-lg bg-white px-3 py-2 text-slate-500">
              Không có khoản khác.
            </p>
          )}
        </div>
      </div>

      {expense.note && (
        <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {expense.note}
        </p>
      )}

      {otherItems.length > 0 && expenseLabelSummary(otherItems) && (
        <p className="mt-2 text-xs text-slate-500">
          Nhãn đã ghi: {expenseLabelSummary(otherItems)}
        </p>
      )}
    </article>
  );
}

function ExpenseValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="break-words font-bold">{value}</p>
    </div>
  );
}

function BreakdownBar({ item }: { item: CategoryBreakdownItem }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{item.label}</span>
        <span className="text-slate-500">
          {formatMoney(item.total)} · {item.percent}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${item.barClassName}`}
          style={{ width: `${item.percent}%` }}
        />
      </div>
    </div>
  );
}

function OtherExpenseLabelRow({
  label,
  total,
  count,
  percent,
}: {
  label: string;
  total: number;
  count: number;
  percent: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{count} lần ghi</p>
        </div>
        <strong className="shrink-0">{formatMoney(total)}</strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Chiếm {percent}% tổng khoản khác.
      </p>
    </div>
  );
}

function ExpenseBudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: ExpenseBudgetRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOverBudget = budget.remaining < 0;
  const isNearLimit = !isOverBudget && budget.percent >= 80;
  const badgeClassName = isOverBudget
    ? "bg-red-50 text-red-700"
    : isNearLimit
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-800";
  const progressClassName = isOverBudget
    ? "bg-red-500"
    : isNearLimit
      ? "bg-amber-500"
      : "bg-emerald-700";

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-base font-black">{budget.label}</h4>
          <p className="text-sm text-slate-500">
            Hạn mức tháng {formatMoney(budget.monthlyLimit)}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClassName}`}>
          {isOverBudget
            ? `Vượt ${formatMoney(Math.abs(budget.remaining))}`
            : `Còn ${formatMoney(budget.remaining)}`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Đã chi</p>
          <p className="font-bold">{formatMoney(budget.spent)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Hạn mức</p>
          <p className="font-bold">{formatMoney(budget.monthlyLimit)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Tỷ lệ</p>
          <p className="font-bold">{budget.percent}%</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${progressClassName}`}
          style={{ width: `${Math.min(budget.percent, 100)}%` }}
        />
      </div>

      <p className="mt-2 text-sm text-slate-500">
        {isOverBudget
          ? "Ngân sách này đã vượt hạn mức, nên kiểm tra lại các khoản chi cùng nhãn."
          : isNearLimit
            ? "Ngân sách này sắp chạm hạn mức, nên giảm chi trong phần còn lại của tháng."
            : "Ngân sách này vẫn còn dư trong tháng hiện tại."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
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
    </article>
  );
}

function MiniRatioRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-600">{label}</span>
        <strong>{formatMoney(value)}</strong>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-emerald-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function getDistinctDateCount(expenses: ExpenseEntry[]) {
  return new Set(expenses.map((expense) => expense.date)).size;
}

function getTopExpense(expenses: ExpenseEntry[]) {
  return expenses.reduce<ExpenseEntry | null>((topExpense, expense) => {
    if (!topExpense) return expense;

    return getExpenseTotal(expense) > getExpenseTotal(topExpense)
      ? expense
      : topExpense;
  }, null);
}

function buildCategoryBreakdown(
  expenses: ExpenseEntry[],
  total: number
): CategoryBreakdownItem[] {
  const breakfast = expenses.reduce((sum, expense) => sum + expense.breakfast, 0);
  const lunch = expenses.reduce((sum, expense) => sum + expense.lunch, 0);
  const dinner = expenses.reduce((sum, expense) => sum + expense.dinner, 0);
  const other = expenses.reduce((sum, expense) => sum + expense.other, 0);

  return [
    {
      label: "Ăn sáng",
      total: breakfast,
      percent: getPercent(breakfast, total),
      barClassName: "bg-emerald-700",
    },
    {
      label: "Ăn trưa",
      total: lunch,
      percent: getPercent(lunch, total),
      barClassName: "bg-blue-600",
    },
    {
      label: "Ăn tối",
      total: dinner,
      percent: getPercent(dinner, total),
      barClassName: "bg-amber-700",
    },
    {
      label: "Khoản khác",
      total: other,
      percent: getPercent(other, total),
      barClassName: "bg-slate-700",
    },
  ];
}

function buildDailyOtherBreakdown(expense: ExpenseEntry): DailyOtherBreakdownItem[] {
  const breakdown = new Map<string, DailyOtherBreakdownItem>();

  getOtherExpenseItems(expense).forEach((item) => {
    const current = breakdown.get(item.label) ?? {
      label: item.label,
      total: 0,
      count: 0,
    };

    breakdown.set(item.label, {
      ...current,
      total: current.total + item.amount,
      count: current.count + 1,
    });
  });

  return [...breakdown.values()].sort((a, b) => b.total - a.total);
}

function expenseLabelSummary(items: ReturnType<typeof getOtherExpenseItems>) {
  const labels = [...new Set(items.map((item) => item.label))];

  return labels.join(", ");
}

function buildExpenseBudgetRows(
  budgets: ExpenseBudget[],
  expenses: ExpenseEntry[]
): ExpenseBudgetRow[] {
  return budgets.map((budget) => {
    const spent = getMonthlySpentByBudgetLabel(budget.label, expenses);
    const remaining = budget.monthlyLimit - spent;

    return {
      ...budget,
      percent: getPercent(spent, budget.monthlyLimit),
      remaining,
      spent,
    };
  });
}

function getMonthlySpentByBudgetLabel(
  label: string,
  expenses: ExpenseEntry[]
) {
  const normalizedLabel = label.trim();
  const monthStart = getMonthStart();
  const today = getToday();

  return expenses
    .filter((expense) => expense.date >= monthStart && expense.date <= today)
    .reduce((sum, expense) => {
      if (normalizedLabel === "Ăn uống") {
        return sum + expense.breakfast + expense.lunch + expense.dinner;
      }

      const otherTotal = getOtherExpenseItems(expense)
        .filter((item) => item.label === normalizedLabel)
        .reduce((itemSum, item) => itemSum + item.amount, 0);

      return sum + otherTotal;
    }, 0);
}

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function buildRangeLabel(fromDate: string, toDate: string) {
  if (fromDate && toDate && fromDate === toDate) {
    return formatDateShort(fromDate);
  }

  if (fromDate && toDate) {
    return `${formatDateShort(fromDate)} - ${formatDateShort(toDate)}`;
  }

  if (fromDate) return `Từ ${formatDateShort(fromDate)}`;
  if (toDate) return `Đến ${formatDateShort(toDate)}`;

  return "Toàn bộ dữ liệu";
}
