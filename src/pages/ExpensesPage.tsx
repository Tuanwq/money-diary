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
import { ExpenseDetails, ExpenseTransactionRow } from "../features/history/components/expenses/ExpenseTransactionRow";
import { LedgerHistoryDetails, LedgerHistoryRow } from "../features/history/components/LedgerHistoryRow";
import { buildCombinedExpenseReport, filterHistoryLedgerTransactions } from "../features/history/historyLedgerModel";
import type { AccountTransaction, FinancialAccount } from "../features/account-ledger/accountLedgerModel";
import type { ExpenseBudget, ExpenseEntry, GoalScreen, Page } from "../types";
import { formatReportDate } from "../utils/date";
import { buildOtherExpenseBreakdown } from "../utils/entries";
import { formatMoney } from "../utils/money";

type ExpenseQuickFilter = "today" | "7days" | "30days" | "month" | "lastMonth" | "all";
type ExpenseBudgetForm = { label: string; monthlyLimit: string };

type ExpensesPageProps = {
  accountTransactions: AccountTransaction[];
  financialAccounts: FinancialAccount[];
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
    accountTransactions,
    financialAccounts,
    cloudLoadError,
    deleteExpense,
    editExpense,
    expenseCurrentPage,
    expenseFromDate,
    expenseLabelFilter,
    expenseLabelOptions,
    expenseSearch,
    expenseToDate,
    expenseTotalPages,
    expenses,
    filteredExpenses,
    isCloudLoading,
    navigateTo,
    onRetry,
    paginatedExpenses,
    setExpenseCurrentPage,
    setExpenseFromDate,
    setExpenseLabelFilter,
    setExpenseQuickFilter,
    setExpenseSearch,
    setExpenseToDate,
  } = props;
  const [selectedExpense, setSelectedExpense] = useState<ExpenseEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExpenseEntry | null>(null);
  const [selectedLedgerTransaction, setSelectedLedgerTransaction] = useState<AccountTransaction | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerExpenses = filterHistoryLedgerTransactions(accountTransactions, {
    fromDate: expenseFromDate, toDate: expenseToDate, search: expenseSearch,
    category: expenseLabelFilter, type: "expense",
  });
  const report = buildCombinedExpenseReport(filteredExpenses, ledgerExpenses);
  const ledgerPageCount = Math.max(1, Math.ceil(ledgerExpenses.length / 20));
  const visibleLedgerExpenses = ledgerExpenses.slice((Math.min(ledgerPage, ledgerPageCount) - 1) * 20, Math.min(ledgerPage, ledgerPageCount) * 20);
  const averagePerDay = report.dayCount > 0 ? Math.round(report.total / report.dayCount) : 0;
  const allLabels = [...new Set([...expenseLabelOptions, ...accountTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.source)
    .map((transaction) => transaction.category.trim()).filter(Boolean)])]
    .sort((a, b) => a.localeCompare(b, "vi"));
  const activeFilters: ActiveHistoryFilter[] = [];
  const isInitialLoading = Boolean(isCloudLoading && expenses.length === 0 && accountTransactions.length === 0);
  const hasInitialError = Boolean(cloudLoadError && expenses.length === 0 && accountTransactions.length === 0);

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
            <span>Nhãn chi tiêu</span>
            <select value={expenseLabelFilter} onChange={(event) => setExpenseLabelFilter(event.target.value)}>
              <option value="">Tất cả nhãn</option>
              {allLabels.map((label) => <option key={label} value={label}>{label}</option>)}
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
        placeholder="Tìm theo ngày, ghi chú hoặc danh mục..."
        quickFilters={quickFilters}
        search={expenseSearch}
        toDate={expenseToDate}
      />

      {!hasInitialError && <HistorySummaryStrip isLoading={isInitialLoading} items={[
        { label: "Tổng chi tiêu", value: formatMoney(report.total) },
        { label: "Số giao dịch", value: String(filteredExpenses.length + ledgerExpenses.length), detail: `${report.dayCount} ngày có dữ liệu` },
        { label: "Trung bình mỗi ngày", value: formatMoney(averagePerDay) },
        { label: "Ngày chi cao nhất", value: report.topDay ? formatMoney(report.topDay[1]) : "0 đ", detail: report.topDay ? formatReportDate(report.topDay[0]) : "Chưa có" },
      ]} />}

      {!isInitialLoading && !hasInitialError && <ExpenseAnalysis categories={report.categories} labels={report.labels} labelsTotal={report.labelsTotal} otherDetails={buildOtherExpenseBreakdown(filteredExpenses)} />}

      {(filteredExpenses.length > 0 || ledgerExpenses.length === 0 || isInitialLoading || hasInitialError) && <section className="history-record-section" aria-labelledby="expense-list-title">
        <div className="history-section-heading"><div><h2 id="expense-list-title">Các khoản chi</h2><p>{isInitialLoading ? "Đang tải dữ liệu..." : `Đang xem ${filteredExpenses.length} trên ${expenses.length} bản ghi.`}</p></div></div>
        {isInitialLoading ? <HistoryLoadingState /> : hasInitialError ? <HistoryErrorState message="Không tải được lịch sử chi tiêu" onRetry={onRetry} /> : filteredExpenses.length === 0 ? (
          <div className="history-empty-state"><ReceiptText aria-hidden="true" size={24} /><h3>Chưa có khoản chi từ nhật ký cũ</h3><p>Các giao dịch chi từ tài khoản được hiển thị bên dưới.</p></div>
        ) : (
          <div className="expense-transaction-list">
            {paginatedExpenses.map((expense) => (
              <ExpenseTransactionRow key={expense.id} expense={expense} onView={() => setSelectedExpense(expense)} onEdit={() => editExpense(expense)} onDelete={() => setPendingDelete(expense)} />
            ))}
          </div>
        )}
        <HistoryPagination currentPage={expenseCurrentPage} totalPages={expenseTotalPages} onPageChange={setExpenseCurrentPage} />
      </section>}

      {!hasInitialError && ledgerExpenses.length > 0 && <section className="history-record-section" aria-labelledby="ledger-expenses-title">
        <div className="history-section-heading"><div><h2 id="ledger-expenses-title">Chi tiêu đã ghi vào tài khoản</h2><p>{ledgerExpenses.length} giao dịch từ ảnh, hũ hoặc nhập trực tiếp.</p></div></div>
        {ledgerExpenses.length > 0 && <div className="expense-transaction-list">
          {visibleLedgerExpenses.map((transaction) => <LedgerHistoryRow key={transaction.id} transaction={transaction} accounts={financialAccounts} onView={() => setSelectedLedgerTransaction(transaction)} />)}
        </div>}
        <HistoryPagination currentPage={Math.min(ledgerPage, ledgerPageCount)} totalPages={ledgerPageCount} onPageChange={setLedgerPage} />
      </section>}

      {!isInitialLoading && !hasInitialError && <section className="history-panel">
        <h2>Hũ chi tiêu</h2>
        <p>Ngân sách theo nhãn đã được chuyển thành hũ. Dữ liệu cũ vẫn được giữ để khôi phục.</p>
        <button type="button" onClick={() => navigateTo("spendingJars")}>Xem và quản lý hũ chi tiêu</button>
      </section>}

      <HistoryDetailDrawer isOpen={Boolean(selectedExpense)} title="Chi tiết khoản chi" subtitle={selectedExpense ? formatReportDate(selectedExpense.date) : undefined} onClose={() => setSelectedExpense(null)} onEdit={selectedExpense ? () => editExpense(selectedExpense) : undefined}>
        {selectedExpense && <ExpenseDetails expense={selectedExpense} />}
      </HistoryDetailDrawer>
      <HistoryDetailDrawer isOpen={Boolean(selectedLedgerTransaction)} title="Chi tiết giao dịch" subtitle={selectedLedgerTransaction ? formatReportDate(selectedLedgerTransaction.date) : undefined} onClose={() => setSelectedLedgerTransaction(null)}>
        {selectedLedgerTransaction && <><LedgerHistoryDetails transaction={selectedLedgerTransaction} accounts={financialAccounts} /><button type="button" className="history-view-action" onClick={() => { setSelectedLedgerTransaction(null); navigateTo("accounts"); }}>Mở Sổ tài khoản</button></>}
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
