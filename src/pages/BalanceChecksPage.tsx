import { ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ITEMS_PER_PAGE } from "../constants";
import { DeleteHistoryRecordDialog } from "../features/history/components/DeleteHistoryRecordDialog";
import { HistoryErrorState, HistoryLoadingState } from "../features/history/components/HistoryAsyncState";
import { HistoryDetailDrawer } from "../features/history/components/HistoryDetailDrawer";
import { HistoryFilterToolbar, type ActiveHistoryFilter } from "../features/history/components/HistoryFilterToolbar";
import { HistoryLayout } from "../features/history/components/HistoryLayout";
import { HistoryPagination } from "../features/history/components/HistoryPagination";
import { HistorySummaryStrip } from "../features/history/components/HistorySummaryStrip";
import { BalanceDetails, BalanceHistoryCard } from "../features/history/components/balance/BalanceHistoryCard";
import { formatSignedDifference } from "../features/history/historySelectors";
import type { BalanceCheckEntry, GoalScreen, Page } from "../types";
import { getBalanceStatus } from "../utils/balance";
import { formatReportDate, getDateDaysAgo, getMonthStart, getToday, isDateInRange } from "../utils/date";
import { formatMoney } from "../utils/money";

type BalanceQuickFilter = "today" | "7days" | "30days" | "month" | "lastMonth" | "all";

type BalanceChecksPageProps = {
  balanceChecks: BalanceCheckEntry[];
  cloudLoadError?: string | null;
  deleteBalanceCheck: (id: string) => void;
  editBalanceCheck: (item: BalanceCheckEntry) => void;
  isCloudLoading?: boolean;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  onRetry?: () => void;
};

const quickFilters = [
  { label: "Hôm nay", value: "today" as const },
  { label: "7 ngày", value: "7days" as const },
  { label: "30 ngày", value: "30days" as const },
  { label: "Tháng này", value: "month" as const },
  { label: "Tháng trước", value: "lastMonth" as const },
];

export function BalanceChecksPage({ balanceChecks, cloudLoadError, deleteBalanceCheck, editBalanceCheck, isCloudLoading, navigateTo, onRetry }: BalanceChecksPageProps) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCheck, setSelectedCheck] = useState<BalanceCheckEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BalanceCheckEntry | null>(null);
  const sortedChecks = useMemo(() => [...balanceChecks].sort((a, b) => b.date.localeCompare(a.date)), [balanceChecks]);
  const filteredChecks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return sortedChecks.filter((item) => {
      const matchesKeyword = !keyword || item.date.includes(keyword) || item.note.toLowerCase().includes(keyword) || getBalanceStatus(item.difference).toLowerCase().includes(keyword);
      return matchesKeyword && isDateInRange(item.date, fromDate, toDate);
    });
  }, [fromDate, search, sortedChecks, toDate]);
  const totalPages = Math.max(1, Math.ceil(filteredChecks.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedChecks = filteredChecks.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const latest = filteredChecks[0];
  const matchedCount = filteredChecks.filter((item) => item.difference === 0).length;
  const activeFilters: ActiveHistoryFilter[] = [];
  const isInitialLoading = Boolean(isCloudLoading && balanceChecks.length === 0);
  const hasInitialError = Boolean(cloudLoadError && balanceChecks.length === 0);

  if (fromDate || toDate) activeFilters.push({ id: "date", label: buildDateFilterLabel(fromDate, toDate), onRemove: () => { setFromDate(""); setToDate(""); setCurrentPage(1); } });

  function setQuickFilter(filter: BalanceQuickFilter) {
    setCurrentPage(1);
    if (filter === "today") { setFromDate(getToday()); setToDate(getToday()); }
    if (filter === "7days") { setFromDate(getDateDaysAgo(6)); setToDate(getToday()); }
    if (filter === "30days") { setFromDate(getDateDaysAgo(29)); setToDate(getToday()); }
    if (filter === "month") { setFromDate(getMonthStart()); setToDate(getToday()); }
    if (filter === "lastMonth") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(toLocalDateString(start));
      setToDate(toLocalDateString(end));
    }
    if (filter === "all") { setFromDate(""); setToDate(""); setSearch(""); }
  }

  return (
    <HistoryLayout currentPage="balanceChecks" navigateTo={navigateTo}>
      <HistoryFilterToolbar
        activeFilters={activeFilters}
        filterCount={activeFilters.length}
        fromDate={fromDate}
        onFromDateChange={(value) => { setFromDate(value); setCurrentPage(1); }}
        onQuickFilter={setQuickFilter}
        onReset={() => setQuickFilter("all")}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(1); }}
        onToDateChange={(value) => { setToDate(value); setCurrentPage(1); }}
        placeholder="Tìm theo ngày hoặc trạng thái số dư..."
        quickFilters={quickFilters}
        search={search}
        toDate={toDate}
      />

      {!hasInitialError && <HistorySummaryStrip isLoading={isInitialLoading} items={[
        { label: "Số lần kiểm kê", value: String(filteredChecks.length) },
        { label: "Số dư thực tế gần nhất", value: latest ? formatMoney(latest.actualMoney) : "0 đ", detail: latest ? formatReportDate(latest.date) : "Chưa có" },
        { label: "Chênh lệch gần nhất", value: latest ? formatSignedDifference(latest.difference) : "0 đ", detail: latest ? getBalanceStatus(latest.difference) : "Chưa có" },
        { label: "Số ngày khớp số dư", value: String(matchedCount) },
      ]} />}

      <section className="history-record-section" aria-labelledby="balance-history-title">
        <div className="history-section-heading"><div><h2 id="balance-history-title">Lịch sử kiểm kê số dư</h2><p>Theo dõi số dư thực tế và chênh lệch so với ứng dụng.</p></div></div>
        {isInitialLoading ? <HistoryLoadingState /> : hasInitialError ? <HistoryErrorState message="Không tải được lịch sử kiểm kê" onRetry={onRetry} /> : filteredChecks.length === 0 ? (
          <div className="history-empty-state"><ClipboardCheck aria-hidden="true" size={24} /><h3>Chưa có lần kiểm kê nào trong khoảng thời gian này.</h3><p>Hãy thay đổi bộ lọc để xem dữ liệu khác.</p></div>
        ) : (
          <div className="balance-history-list">
            {paginatedChecks.map((item) => <BalanceHistoryCard key={item.id} item={item} onView={() => setSelectedCheck(item)} onEdit={() => editBalanceCheck(item)} onDelete={() => setPendingDelete(item)} />)}
          </div>
        )}
        <HistoryPagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </section>

      <HistoryDetailDrawer isOpen={Boolean(selectedCheck)} title="Chi tiết kiểm kê" subtitle={selectedCheck ? formatReportDate(selectedCheck.date) : undefined} onClose={() => setSelectedCheck(null)} onEdit={selectedCheck ? () => editBalanceCheck(selectedCheck) : undefined}>
        {selectedCheck && <BalanceDetails item={selectedCheck} />}
      </HistoryDetailDrawer>

      <DeleteHistoryRecordDialog isOpen={Boolean(pendingDelete)} title="Xóa kiểm kê số dư?" description={`Bạn sắp xóa kiểm kê ngày ${pendingDelete ? formatReportDate(pendingDelete.date) : ""}. Thao tác này có thể được xem lại trong lịch sử thay đổi dữ liệu.`} onCancel={() => setPendingDelete(null)} onConfirm={() => {
        if (!pendingDelete) return;
        deleteBalanceCheck(pendingDelete.id);
        if (paginatedChecks.length === 1 && safePage > 1) setCurrentPage(safePage - 1);
        setPendingDelete(null);
        setSelectedCheck(null);
      }} />
    </HistoryLayout>
  );
}

function buildDateFilterLabel(fromDate: string, toDate: string) { if (fromDate && toDate) return `${formatReportDate(fromDate)} – ${formatReportDate(toDate)}`; if (fromDate) return `Từ ${formatReportDate(fromDate)}`; return `Đến ${formatReportDate(toDate)}`; }
function toLocalDateString(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
