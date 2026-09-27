import { BookOpenText } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { DeleteHistoryRecordDialog } from "../features/history/components/DeleteHistoryRecordDialog";
import { HistoryErrorState, HistoryLoadingState } from "../features/history/components/HistoryAsyncState";
import { HistoryDetailDrawer } from "../features/history/components/HistoryDetailDrawer";
import { HistoryFilterToolbar, type ActiveHistoryFilter } from "../features/history/components/HistoryFilterToolbar";
import { HistoryLayout } from "../features/history/components/HistoryLayout";
import { HistoryPagination } from "../features/history/components/HistoryPagination";
import { HistorySummaryStrip } from "../features/history/components/HistorySummaryStrip";
import { JournalDayCard, JournalDetails } from "../features/history/components/journal/JournalDayCard";
import { LedgerHistoryDetails, LedgerHistoryRow } from "../features/history/components/LedgerHistoryRow";
import { filterHistoryLedgerTransactions } from "../features/history/historyLedgerModel";
import type { AccountTransaction, FinancialAccount } from "../features/account-ledger/accountLedgerModel";
import type { DailyEntry, GoalScreen, Page } from "../types";
import { formatReportDate } from "../utils/date";
import { formatMoney } from "../utils/money";

type HistoryQuickFilter = "today" | "7days" | "30days" | "month" | "lastMonth" | "all";

type HistoryPageProps = {
  accountTransactions: AccountTransaction[];
  financialAccounts: FinancialAccount[];
  cloudLoadError?: string | null;
  deleteEntry: (id: string) => void;
  editEntry: (entry: DailyEntry) => void;
  filteredEntries: DailyEntry[];
  filteredEntriesHours: number;
  filteredEntriesOrders: number;
  filteredEntriesTotalMoney: number;
  historyCurrentPage: number;
  historyFromDate: string;
  historySearch: string;
  historyToDate: string;
  historyTotalPages: number;
  isCloudLoading?: boolean;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  onRetry?: () => void;
  paginatedEntries: DailyEntry[];
  setHistoryCurrentPage: Dispatch<SetStateAction<number>>;
  setHistoryFromDate: (value: string) => void;
  setHistoryQuickFilter: (type: HistoryQuickFilter) => void;
  setHistorySearch: (value: string) => void;
  setHistoryToDate: (value: string) => void;
  sortedEntries: DailyEntry[];
};

const quickFilters = [
  { label: "Hôm nay", value: "today" as const },
  { label: "7 ngày", value: "7days" as const },
  { label: "30 ngày", value: "30days" as const },
  { label: "Tháng này", value: "month" as const },
  { label: "Tháng trước", value: "lastMonth" as const },
];

export function HistoryPage({
  accountTransactions,
  financialAccounts,
  cloudLoadError,
  deleteEntry,
  editEntry,
  filteredEntries,
  filteredEntriesHours,
  filteredEntriesOrders,
  filteredEntriesTotalMoney,
  historyCurrentPage,
  historyFromDate,
  historySearch,
  historyToDate,
  historyTotalPages,
  isCloudLoading,
  navigateTo,
  onRetry,
  paginatedEntries,
  setHistoryCurrentPage,
  setHistoryFromDate,
  setHistoryQuickFilter,
  setHistorySearch,
  setHistoryToDate,
  sortedEntries,
}: HistoryPageProps) {
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DailyEntry | null>(null);
  const [selectedLedgerTransaction, setSelectedLedgerTransaction] = useState<AccountTransaction | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerTransactions = filterHistoryLedgerTransactions(accountTransactions, {
    fromDate: historyFromDate, toDate: historyToDate, search: historySearch,
  });
  const ledgerIncome = ledgerTransactions.reduce((sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : 0), 0);
  const datesWithData = new Set([...filteredEntries.map((entry) => entry.date), ...ledgerTransactions.map((transaction) => transaction.date)]).size;
  const ledgerPageCount = Math.max(1, Math.ceil(ledgerTransactions.length / 20));
  const visibleLedgerTransactions = ledgerTransactions.slice((Math.min(ledgerPage, ledgerPageCount) - 1) * 20, Math.min(ledgerPage, ledgerPageCount) * 20);
  const activeFilters: ActiveHistoryFilter[] = [];
  const isInitialLoading = Boolean(isCloudLoading && sortedEntries.length === 0 && accountTransactions.length === 0);
  const hasInitialError = Boolean(cloudLoadError && sortedEntries.length === 0 && accountTransactions.length === 0);

  if (historyFromDate || historyToDate) {
    activeFilters.push({
      id: "date",
      label: buildDateFilterLabel(historyFromDate, historyToDate),
      onRemove: () => {
        setHistoryFromDate("");
        setHistoryToDate("");
      },
    });
  }

  return (
    <HistoryLayout currentPage="history" navigateTo={navigateTo}>
      <HistoryFilterToolbar
        activeFilters={activeFilters}
        filterCount={activeFilters.length}
        fromDate={historyFromDate}
        onFromDateChange={setHistoryFromDate}
        onQuickFilter={setHistoryQuickFilter}
        onReset={() => setHistoryQuickFilter("all")}
        onSearchChange={setHistorySearch}
        onToDateChange={setHistoryToDate}
        placeholder="Tìm theo ngày, nhật ký, danh mục hoặc ghi chú..."
        quickFilters={quickFilters}
        search={historySearch}
        toDate={historyToDate}
      />

      {!hasInitialError && (
        <HistorySummaryStrip
          isLoading={isInitialLoading}
          items={[
            { label: "Số ngày có dữ liệu", value: String(datesWithData) },
            { label: "Tổng thu nhập", value: formatMoney(filteredEntriesTotalMoney + ledgerIncome) },
            { label: "Giờ trong nhật ký", value: `${filteredEntriesHours} giờ` },
            { label: "Đơn trong nhật ký", value: `${filteredEntriesOrders} đơn` },
          ]}
        />
      )}

      {(filteredEntries.length > 0 || ledgerTransactions.length === 0 || isInitialLoading || hasInitialError) && <section className="history-record-section" aria-labelledby="journal-history-title">
        <div className="history-section-heading">
          <div>
            <h2 id="journal-history-title">Lịch sử nhật ký</h2>
            <p>{isInitialLoading ? "Đang tải dữ liệu..." : `${filteredEntries.length} nhật ký phù hợp với bộ lọc hiện tại.`}</p>
          </div>
        </div>

        {isInitialLoading ? (
          <HistoryLoadingState />
        ) : hasInitialError ? (
          <HistoryErrorState message="Không tải được lịch sử nhật ký" onRetry={onRetry} />
        ) : filteredEntries.length === 0 ? (
          <div className="history-empty-state">
            <BookOpenText aria-hidden="true" size={24} />
            <h3>Chưa có nhật ký văn bản trong khoảng thời gian này.</h3>
            <p>Giao dịch tài chính nếu có được hiển thị bên dưới.</p>
          </div>
        ) : (
          <div className="journal-history-list">
            {paginatedEntries.map((entry) => (
              <JournalDayCard
                key={entry.id}
                entry={entry}
                onDelete={() => setPendingDelete(entry)}
                onEdit={() => editEntry(entry)}
                onView={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}

        <HistoryPagination
          currentPage={historyCurrentPage}
          totalPages={historyTotalPages}
          onPageChange={setHistoryCurrentPage}
        />
      </section>}

      {!hasInitialError && ledgerTransactions.length > 0 && <section className="history-record-section" aria-labelledby="journal-ledger-title">
        <div className="history-section-heading"><div><h2 id="journal-ledger-title">Giao dịch trong nhật ký tài chính</h2><p>{ledgerTransactions.length} giao dịch từ ảnh, hũ hoặc nhập trực tiếp. Chuyển nội bộ không tính vào tổng thu nhập.</p></div></div>
        {ledgerTransactions.length > 0 && <div className="expense-transaction-list">
          {visibleLedgerTransactions.map((transaction) => <LedgerHistoryRow key={transaction.id} transaction={transaction} accounts={financialAccounts} onView={() => setSelectedLedgerTransaction(transaction)} />)}
        </div>}
        <HistoryPagination currentPage={Math.min(ledgerPage, ledgerPageCount)} totalPages={ledgerPageCount} onPageChange={setLedgerPage} />
      </section>}

      <HistoryDetailDrawer
        isOpen={Boolean(selectedEntry)}
        title="Chi tiết nhật ký"
        subtitle={selectedEntry ? formatReportDate(selectedEntry.date) : undefined}
        onClose={() => setSelectedEntry(null)}
        onEdit={selectedEntry ? () => editEntry(selectedEntry) : undefined}
      >
        {selectedEntry && <JournalDetails entry={selectedEntry} />}
      </HistoryDetailDrawer>
      <HistoryDetailDrawer isOpen={Boolean(selectedLedgerTransaction)} title="Chi tiết giao dịch" subtitle={selectedLedgerTransaction ? formatReportDate(selectedLedgerTransaction.date) : undefined} onClose={() => setSelectedLedgerTransaction(null)}>
        {selectedLedgerTransaction && <><LedgerHistoryDetails transaction={selectedLedgerTransaction} accounts={financialAccounts} /><button type="button" className="history-view-action" onClick={() => { setSelectedLedgerTransaction(null); navigateTo("accounts"); }}>Mở Sổ tài khoản</button></>}
      </HistoryDetailDrawer>

      <DeleteHistoryRecordDialog
        isOpen={Boolean(pendingDelete)}
        title="Xóa nhật ký?"
        description={`Bạn sắp xóa nhật ký ngày ${pendingDelete ? formatReportDate(pendingDelete.date) : ""}. Thao tác này có thể được xem lại trong lịch sử thay đổi dữ liệu.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteEntry(pendingDelete.id);
          if (paginatedEntries.length === 1 && historyCurrentPage > 1) {
            setHistoryCurrentPage(historyCurrentPage - 1);
          }
          setPendingDelete(null);
          setSelectedEntry(null);
        }}
      />
    </HistoryLayout>
  );
}

function buildDateFilterLabel(fromDate: string, toDate: string) {
  if (fromDate && toDate) return `${formatReportDate(fromDate)} – ${formatReportDate(toDate)}`;
  if (fromDate) return `Từ ${formatReportDate(fromDate)}`;
  return `Đến ${formatReportDate(toDate)}`;
}
