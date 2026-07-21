import { ReceiptText } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { DeleteHistoryRecordDialog } from "../features/history/components/DeleteHistoryRecordDialog";
import { HistoryErrorState, HistoryLoadingState } from "../features/history/components/HistoryAsyncState";
import { HistoryDetailDrawer } from "../features/history/components/HistoryDetailDrawer";
import { HistoryFilterToolbar, type ActiveHistoryFilter } from "../features/history/components/HistoryFilterToolbar";
import { HistoryLayout } from "../features/history/components/HistoryLayout";
import { HistoryPagination } from "../features/history/components/HistoryPagination";
import { HistorySummaryStrip } from "../features/history/components/HistorySummaryStrip";
import { ExpenseAnalysis } from "../features/history/components/expenses/ExpenseAnalysis";
import { ExpenseBudgetSection } from "../features/history/components/expenses/ExpenseBudgetSection";
import { ExpenseDetails, ExpenseTransactionRow } from "../features/history/components/expenses/ExpenseTransactionRow";
import { buildExpenseBudgetRows, buildExpenseCategoryBreakdown, getDistinctExpenseDateCount, getTopExpense } from "../features/history/historySelectors";
import type { ExpenseBudget, ExpenseEntry, GoalScreen, Page } from "../types";
import { formatReportDate } from "../utils/date";
import { buildOtherExpenseBreakdown, getExpenseTotal } from "../utils/entries";
import { formatMoney } from "../utils/money";

type ExpenseQuickFilter = "today" | "7days" | "30days" | "month" | "lastMonth" | "all";
type ExpenseBudgetForm = { label: string; monthlyLimit: string };

type ExpensesPageProps = {
  cancelEditExpenseBudget: () => void;
  cloudLoadError?: string | null;
  deleteExpense: (id: string) => void;
  deleteExpenseBudget: (id: string) => void;
  editExpense: (expense: ExpenseEntry) => void;
  editingExpenseBudgetId: string | null;
  expenseBudgetForm: ExpenseBudgetForm;
  expenseBudgets: ExpenseBudget[];
  expenseCurrentPage: number;
  expenseFromDate: string;
  expenseLabelFilter: string;
  expenseLabelOptions: string[];
  expenseSearch: string;
  expenseToDate: string;
  expenseTotalPages: number;
  expenses: ExpenseEntry[];
  filteredExpenses: ExpenseEntry[];
  filteredExpensesTotal: number;
  isCloudLoading?: boolean;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  onRetry?: () => void;
  paginatedExpenses: ExpenseEntry[];
  saveExpenseBudget: () => void;
  setExpenseBudgetForm: Dispatch<SetStateAction<ExpenseBudgetForm>>;
  setExpenseCurrentPage: Dispatch<SetStateAction<number>>;
  setExpenseFromDate: (value: string) => void;
  setExpenseLabelFilter: (value: string) => void;
  setExpenseQuickFilter: (type: ExpenseQuickFilter) => void;
  setExpenseSearch: (value: string) => void;
  setExpenseToDate: (value: string) => void;
  startEditExpenseBudget: (budget: ExpenseBudget) => void;
};

const quickFilters = [
  { label: "Hôm nay", value: "today" as const },
  { label: "7 ngày", value: "7days" as const },
  { label: "30 ngày", value: "30days" as const },
  { label: "Tháng này", value: "month" as const },
  { label: "Tháng trước", value: "lastMonth" as const },
];

export function ExpensesPage(props: ExpensesPageProps) {
  const {
    cancelEditExpenseBudget,
    cloudLoadError,
    deleteExpense,
    deleteExpenseBudget,
    editExpense,
    editingExpenseBudgetId,
    expenseBudgetForm,
    expenseBudgets,
    expenseCurrentPage,
    expenseFromDate,
    expenseLabelFilter,
    expenseLabelOptions,
    expenseSearch,
    expenseToDate,
    expenseTotalPages,
    expenses,
    filteredExpenses,
    filteredExpensesTotal,
    isCloudLoading,
    navigateTo,
    onRetry,
    paginatedExpenses,
    saveExpenseBudget,
    setExpenseBudgetForm,
    setExpenseCurrentPage,
    setExpenseFromDate,
    setExpenseLabelFilter,
    setExpenseQuickFilter,
    setExpenseSearch,
    setExpenseToDate,
    startEditExpenseBudget,
  } = props;
  const [selectedExpense, setSelectedExpense] = useState<ExpenseEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExpenseEntry | null>(null);
  const dayCount = getDistinctExpenseDateCount(filteredExpenses);
  const averagePerDay = dayCount > 0 ? Math.round(filteredExpensesTotal / dayCount) : 0;
  const topExpense = getTopExpense(filteredExpenses);
  const otherBreakdown = buildOtherExpenseBreakdown(filteredExpenses);
  const otherTotal = otherBreakdown.reduce((sum, item) => sum + item.total, 0);
  const categoryBreakdown = buildExpenseCategoryBreakdown(filteredExpenses, filteredExpensesTotal);
  const budgetRows = buildExpenseBudgetRows(expenseBudgets, expenses);
  const activeFilters: ActiveHistoryFilter[] = [];
  const isInitialLoading = Boolean(isCloudLoading && expenses.length === 0);
  const hasInitialError = Boolean(cloudLoadError && expenses.length === 0);

  if (expenseFromDate || expenseToDate) {
    activeFilters.push({ id: "date", label: buildDateFilterLabel(expenseFromDate, expenseToDate), onRemove: () => {
      setExpenseFromDate("");
      setExpenseToDate("");
    } });
  }
  if (expenseLabelFilter) {
    activeFilters.push({ id: "label", label: expenseLabelFilter, onRemove: () => setExpenseLabelFilter("") });
  }

  return (
    <HistoryLayout currentPage="expenses" navigateTo={navigateTo}>
      <HistoryFilterToolbar
        activeFilters={activeFilters}
        extraFilters={
          <label className="history-extra-filter">
            <span>Nhãn khoản khác</span>
            <select value={expenseLabelFilter} onChange={(event) => setExpenseLabelFilter(event.target.value)}>
              <option value="">Tất cả nhãn</option>
              {expenseLabelOptions.map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>
        }
        filterCount={activeFilters.length}
        fromDate={expenseFromDate}
        onFromDateChange={setExpenseFromDate}
        onQuickFilter={setExpenseQuickFilter}
        onReset={() => setExpenseQuickFilter("all")}
        onSearchChange={setExpenseSearch}
        onToDateChange={setExpenseToDate}
        placeholder="Tìm theo ngày, ghi chú hoặc nhãn..."
        quickFilters={quickFilters}
        search={expenseSearch}
        toDate={expenseToDate}
      />

      {!hasInitialError && <HistorySummaryStrip isLoading={isInitialLoading} items={[
        { label: "Tổng chi tiêu", value: formatMoney(filteredExpensesTotal) },
        { label: "Số giao dịch", value: String(filteredExpenses.length), detail: `${dayCount} ngày có dữ liệu` },
        { label: "Trung bình mỗi ngày", value: formatMoney(averagePerDay) },
        { label: "Ngày chi cao nhất", value: topExpense ? formatMoney(getExpenseTotal(topExpense)) : "0 đ", detail: topExpense ? formatReportDate(topExpense.date) : "Chưa có" },
      ]} />}

      {!isInitialLoading && !hasInitialError && <ExpenseAnalysis categories={categoryBreakdown} labels={otherBreakdown} labelsTotal={otherTotal} />}

      <section className="history-record-section" aria-labelledby="expense-list-title">
        <div className="history-section-heading"><div><h2 id="expense-list-title">Các khoản chi</h2><p>{isInitialLoading ? "Đang tải dữ liệu..." : `Đang xem ${filteredExpenses.length} trên ${expenses.length} bản ghi.`}</p></div></div>
        {isInitialLoading ? <HistoryLoadingState /> : hasInitialError ? <HistoryErrorState message="Không tải được lịch sử chi tiêu" onRetry={onRetry} /> : filteredExpenses.length === 0 ? (
          <div className="history-empty-state"><ReceiptText aria-hidden="true" size={24} /><h3>Chưa có khoản chi phù hợp</h3><p>Hãy thay đổi bộ lọc hoặc thêm khoản chi mới.</p></div>
        ) : (
          <div className="expense-transaction-list">
            {paginatedExpenses.map((expense) => (
              <ExpenseTransactionRow key={expense.id} expense={expense} onView={() => setSelectedExpense(expense)} onEdit={() => editExpense(expense)} onDelete={() => setPendingDelete(expense)} />
            ))}
          </div>
        )}
        <HistoryPagination currentPage={expenseCurrentPage} totalPages={expenseTotalPages} onPageChange={setExpenseCurrentPage} />
      </section>

      {!isInitialLoading && !hasInitialError && <ExpenseBudgetSection
        budgetRows={budgetRows}
        cancelEdit={cancelEditExpenseBudget}
        deleteBudget={deleteExpenseBudget}
        editingId={editingExpenseBudgetId}
        form={expenseBudgetForm}
        labelOptions={["Ăn uống", ...expenseLabelOptions.filter((label) => label !== "Ăn uống")]}
        save={saveExpenseBudget}
        setForm={setExpenseBudgetForm}
        startEdit={startEditExpenseBudget}
      />}

      <HistoryDetailDrawer isOpen={Boolean(selectedExpense)} title="Chi tiết khoản chi" subtitle={selectedExpense ? formatReportDate(selectedExpense.date) : undefined} onClose={() => setSelectedExpense(null)} onEdit={selectedExpense ? () => editExpense(selectedExpense) : undefined}>
        {selectedExpense && <ExpenseDetails expense={selectedExpense} />}
      </HistoryDetailDrawer>

      <DeleteHistoryRecordDialog isOpen={Boolean(pendingDelete)} title="Xóa khoản chi?" description={`Bạn sắp xóa khoản chi ngày ${pendingDelete ? formatReportDate(pendingDelete.date) : ""}. Thao tác này có thể được xem lại trong lịch sử thay đổi dữ liệu.`} onCancel={() => setPendingDelete(null)} onConfirm={() => {
        if (!pendingDelete) return;
        deleteExpense(pendingDelete.id);
        if (paginatedExpenses.length === 1 && expenseCurrentPage > 1) setExpenseCurrentPage(expenseCurrentPage - 1);
        setPendingDelete(null);
        setSelectedExpense(null);
      }} />
    </HistoryLayout>
  );
}

function buildDateFilterLabel(fromDate: string, toDate: string) { if (fromDate && toDate) return `${formatReportDate(fromDate)} – ${formatReportDate(toDate)}`; if (fromDate) return `Từ ${formatReportDate(fromDate)}`; return `Đến ${formatReportDate(toDate)}`; }
