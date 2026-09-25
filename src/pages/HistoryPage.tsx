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
import type { DailyEntry, GoalScreen, Page } from "../types";
import { formatReportDate } from "../utils/date";
import { formatMoney } from "../utils/money";

type HistoryQuickFilter = "today" | "7days" | "30days" | "month" | "lastMonth" | "all";

type HistoryPageProps = {
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
  const activeFilters: ActiveHistoryFilter[] = [];
  const isInitialLoading = Boolean(isCloudLoading && sortedEntries.length === 0);
  const hasInitialError = Boolean(cloudLoadError && sortedEntries.length === 0);

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
        placeholder="Tìm theo ngày, nhật ký hoặc ghi chú..."
        quickFilters={quickFilters}
        search={historySearch}
        toDate={historyToDate}
      />

      {!hasInitialError && (
        <HistorySummaryStrip
          isLoading={isInitialLoading}
          items={[
            { label: "Số ngày có dữ liệu", value: String(filteredEntries.length) },
            { label: "Tổng thu nhập", value: formatMoney(filteredEntriesTotalMoney) },
            { label: "Tổng giờ", value: `${filteredEntriesHours} giờ` },
            { label: "Tổng đơn", value: `${filteredEntriesOrders} đơn` },
          ]}
        />
      )}

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
