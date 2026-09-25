import { BookOpenText } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { AccountTransaction, FinancialAccount } from "../features/account-ledger/accountLedgerModel.ts";
import type { AccountReconciliation } from "../features/account-reconciliation/accountReconciliationModel.ts";
import type { JarActivity, SpendingJar } from "../features/spending-jars/domain/jarModel.ts";
import type { HubEntry, HubSettings } from "../types/hub.ts";
import { summarizeFinancialTransactions } from "../features/finance-core/services/financialMetrics.ts";
import { buildFinancialHistoryEvents, type FinancialHistoryKind } from "../features/history/services/financialHistoryModel.ts";
import { FinancialHistoryFeed } from "../features/history/components/FinancialHistoryFeed.tsx";
import { DeleteHistoryRecordDialog } from "../features/history/components/DeleteHistoryRecordDialog";
import { HistoryErrorState, HistoryLoadingState } from "../features/history/components/HistoryAsyncState";
import { HistoryDetailDrawer } from "../features/history/components/HistoryDetailDrawer";
import { HistoryFilterToolbar, type ActiveHistoryFilter } from "../features/history/components/HistoryFilterToolbar";
import { HistoryLayout } from "../features/history/components/HistoryLayout";
import { HistoryPagination } from "../features/history/components/HistoryPagination";
import { HistorySummaryStrip } from "../features/history/components/HistorySummaryStrip";
import { JournalDayCard, JournalDetails } from "../features/history/components/journal/JournalDayCard";
import type { DailyEntry, GoalScreen, Page } from "../types";
import { formatReportDate } from "../utils/date";
import { formatMoney } from "../utils/money";

type HistoryQuickFilter = "today" | "7days" | "30days" | "month" | "lastMonth" | "all";

type HistoryPageProps = {
  cloudLoadError?: string | null;
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  accountReconciliations: AccountReconciliation[];
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
  jars: SpendingJar[];
  jarActivities: JarActivity[];
  deleteEntry: (id: string) => void;
  editEntry: (entry: DailyEntry) => void;
  filteredEntries: DailyEntry[];
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
  cloudLoadError,
  accounts,
  accountTransactions,
  accountReconciliations,
  hubEntries,
  hubSettings,
  jars,
  jarActivities,
  deleteEntry,
  editEntry,
  filteredEntries,
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
  const [kindFilter, setKindFilter] = useState<"all" | FinancialHistoryKind>("all");
  const financialEvents = useMemo(() => buildFinancialHistoryEvents({
    accounts, transactions: accountTransactions, reconciliations: accountReconciliations,
    hubEntries, hubSettings, jars, jarActivities,
  }), [accounts, accountTransactions, accountReconciliations, hubEntries, hubSettings, jars, jarActivities]);
  const visibleEvents = useMemo(() => financialEvents.filter((event) => {
    if (historyFromDate && event.date < historyFromDate) return false;
    if (historyToDate && event.date > historyToDate) return false;
    if (kindFilter !== "all" && event.kind !== kindFilter &&
      !(kindFilter === "jar" && event.source === "spending_jar") &&
      !(kindFilter === "hub" && event.source === "hub")) return false;
    const query = historySearch.trim().toLocaleLowerCase("vi-VN");
    return !query || [event.date, event.title, event.detail].some((value) =>
      value.toLocaleLowerCase("vi-VN").includes(query));
  }), [financialEvents, historyFromDate, historyToDate, historySearch, kindFilter]);
  const visibleIds = new Set(visibleEvents.map((item) => item.transactionId).filter(Boolean));
  const financialTotals = summarizeFinancialTransactions(accountTransactions.filter((item) => visibleIds.has(item.id)));
  const activeFilters: ActiveHistoryFilter[] = [];
  const isInitialLoading = Boolean(isCloudLoading && sortedEntries.length === 0 && financialEvents.length === 0);
  const hasInitialError = Boolean(cloudLoadError && sortedEntries.length === 0 && financialEvents.length === 0);

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
        placeholder="Tìm giao dịch, tài khoản, ghi chú..."
        quickFilters={quickFilters}
        search={historySearch}
        toDate={historyToDate}
      />

      {!hasInitialError && (
        <HistorySummaryStrip
          isLoading={isInitialLoading}
          items={[
            { label: "Thu nhập", value: formatMoney(financialTotals.income) },
            { label: "Chi tiêu", value: formatMoney(financialTotals.expense) },
            { label: "Dòng tiền ròng", value: formatMoney(financialTotals.net) },
            { label: "Chuyển nội bộ", value: formatMoney(financialTotals.transfer) },
          ]}
        />
      )}

      <section className="history-record-section" aria-labelledby="financial-history-title">
        <div className="history-section-heading"><div>
          <h2 id="financial-history-title">Dòng hoạt động tài chính</h2>
          <p>Thu, chi và chuyển tiền lấy từ Sổ tài khoản. Ca HUB, hũ và kiểm kê chỉ là hoạt động tham chiếu.</p>
        </div></div>
        <div className="financial-history-type-filter" role="group" aria-label="Lọc loại hoạt động">
          {([ ["all", "Tất cả"], ["income", "Thu nhập"], ["expense", "Chi tiêu"],
            ["transfer", "Chuyển nội bộ"], ["hub", "Ca HUB"],
            ["reconciliation", "Kiểm kê"], ["jar", "Hũ"] ] as const).map(([kind, label]) =>
            <button key={kind} className={kindFilter === kind ? "is-active" : ""}
              type="button" onClick={() => setKindFilter(kind)}>{label}</button>)}
        </div>
        <FinancialHistoryFeed events={visibleEvents.slice(0, 100)} onOpenTransaction={() => navigateTo("accounts")} />
        {visibleEvents.length > 100 && <p>Hiển thị 100 hoạt động mới nhất. Thu hẹp khoảng ngày để xem thêm.</p>}
      </section>

      <details className="history-legacy-journal">
        <summary>Nhật ký cũ ({filteredEntries.length} ngày) · dữ liệu tài chính chưa đối chiếu, không cộng vào số liệu trên</summary>
      <section className="history-record-section" aria-labelledby="journal-history-title">
        <div className="history-section-heading">
          <div>
            <h2 id="journal-history-title">Lịch sử nhật ký</h2>
            <p>{isInitialLoading ? "Đang tải dữ liệu..." : `${filteredEntries.length} ngày phù hợp với bộ lọc hiện tại.`}</p>
          </div>
        </div>

        {isInitialLoading ? (
          <HistoryLoadingState />
        ) : hasInitialError ? (
          <HistoryErrorState message="Không tải được lịch sử nhật ký" onRetry={onRetry} />
        ) : filteredEntries.length === 0 ? (
          <div className="history-empty-state">
            <BookOpenText aria-hidden="true" size={24} />
            <h3>Chưa có nhật ký trong khoảng thời gian này.</h3>
            <p>Hãy thay đổi bộ lọc để xem các ngày khác.</p>
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
      </section>
      </details>

      <HistoryDetailDrawer
        isOpen={Boolean(selectedEntry)}
        title="Chi tiết nhật ký"
        subtitle={selectedEntry ? formatReportDate(selectedEntry.date) : undefined}
        onClose={() => setSelectedEntry(null)}
        onEdit={selectedEntry ? () => editEntry(selectedEntry) : undefined}
      >
        {selectedEntry && <JournalDetails entry={selectedEntry} />}
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
