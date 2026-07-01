import type { Dispatch, SetStateAction } from "react";
import { ITEMS_PER_PAGE, moodLabels } from "../constants";
import type { DailyEntry, GoalScreen, Page } from "../types";
import {
  getBonusMoney,
  getMainIncome,
  getReceivedMoney,
  getTotalEntryMoney,
} from "../utils/entries";
import { formatMoney } from "../utils/money";

type HistoryQuickFilter = "today" | "7days" | "month" | "all";

type HistoryPageProps = {
  historySearch: string;
  setHistorySearch: (value: string) => void;
  historyFromDate: string;
  setHistoryFromDate: (value: string) => void;
  historyToDate: string;
  setHistoryToDate: (value: string) => void;
  setHistoryQuickFilter: (type: HistoryQuickFilter) => void;
  filteredEntries: DailyEntry[];
  sortedEntries: DailyEntry[];
  paginatedEntries: DailyEntry[];
  filteredEntriesTotalMoney: number;
  filteredEntriesNormalMoney: number;
  filteredEntriesHours: number;
  filteredEntriesOrders: number;
  editEntry: (entry: DailyEntry) => void;
  deleteEntry: (id: string) => void;
  historyCurrentPage: number;
  setHistoryCurrentPage: Dispatch<SetStateAction<number>>;
  historyTotalPages: number;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function HistoryPage({
  historySearch,
  setHistorySearch,
  historyFromDate,
  setHistoryFromDate,
  historyToDate,
  setHistoryToDate,
  setHistoryQuickFilter,
  filteredEntries,
  sortedEntries,
  paginatedEntries,
  filteredEntriesTotalMoney,
  filteredEntriesNormalMoney,
  filteredEntriesHours,
  filteredEntriesOrders,
  editEntry,
  deleteEntry,
  historyCurrentPage,
  setHistoryCurrentPage,
  historyTotalPages,
  navigateTo,
}: HistoryPageProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử nhật kí</h2>
          <p className="text-sm text-slate-500">
            Xem lại, sửa hoặc xóa các ngày đã ghi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("home", "menu")}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Về trang chủ
        </button>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-sm font-medium">Tìm kiếm</label>
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Tìm theo ngày, nhật kí, ghi chú..."
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <DateFilter
            label="Từ ngày"
            value={historyFromDate}
            onChange={setHistoryFromDate}
          />
          <DateFilter
            label="Đến ngày"
            value={historyToDate}
            onChange={setHistoryToDate}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <QuickFilterButton onClick={() => setHistoryQuickFilter("today")}>
            Hôm nay
          </QuickFilterButton>
          <QuickFilterButton onClick={() => setHistoryQuickFilter("7days")}>
            7 ngày
          </QuickFilterButton>
          <QuickFilterButton onClick={() => setHistoryQuickFilter("month")}>
            Tháng này
          </QuickFilterButton>
          <button
            type="button"
            onClick={() => setHistoryQuickFilter("all")}
            className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Xóa lọc
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard label="Số bản ghi" value={String(filteredEntries.length)} />
        <SummaryCard
          label="Tổng ngày lọc"
          value={formatMoney(filteredEntriesTotalMoney)}
        />
        <SummaryCard
          label="Tính cho biểu đồ"
          value={formatMoney(filteredEntriesNormalMoney)}
        />
        <SummaryCard label="Tổng giờ" value={`${filteredEntriesHours} giờ`} />
        <SummaryCard label="Tổng đơn" value={`${filteredEntriesOrders} đơn`} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        {sortedEntries.length === 0 ? (
          <p className="text-slate-500">
            Chưa có nhật ký nào. Hãy nhập ngày đầu tiên của bạn.
          </p>
        ) : (
          <div className="grid gap-3">
            {paginatedEntries.map((entry) => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => editEntry(entry)}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </div>
        )}

        {filteredEntries.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                setHistoryCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={historyCurrentPage === 1}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>

            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium">
              Trang {historyCurrentPage} / {historyTotalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setHistoryCurrentPage((prev) =>
                  Math.min(prev + 1, historyTotalPages)
                )
              }
              disabled={historyCurrentPage === historyTotalPages}
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

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>
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

function HistoryEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: DailyEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const mainIncome = getMainIncome(entry);
  const receivedMoney = getReceivedMoney(entry);
  const bonusMoney = getBonusMoney(entry);
  const totalEntryMoney = getTotalEntryMoney(entry);

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{entry.date}</h3>
          <p className="text-sm text-slate-500">
            Tổng ngày này: {formatMoney(totalEntryMoney)} · {entry.workHours}{" "}
            giờ · {moodLabels[entry.mood]}
          </p>
        </div>

        <div className="flex gap-2">
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

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:text-sm lg:grid-cols-6">
        <EntryValue label="Tiền làm được" value={formatMoney(mainIncome)} />
        <EntryValue label="Tiền thưởng" value={formatMoney(bonusMoney)} />
        <EntryValue label="Tiền nhận được" value={formatMoney(receivedMoney)} />
        <EntryValue label="Tổng ngày này" value={formatMoney(totalEntryMoney)} />
        <EntryValue label="Giờ làm" value={`${entry.workHours} giờ`} />
        <div className="min-w-0 rounded-xl bg-slate-100 p-2 sm:p-3">
          <p className="truncate text-slate-500">Số đơn</p>
          <p className="break-words text-sm font-bold sm:text-base">
            {entry.orderCount ?? 0} đơn
          </p>
        </div>
      </div>

      {entry.diary && <p className="mt-3 whitespace-pre-line">{entry.diary}</p>}

      {entry.note && (
        <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {entry.note}
        </p>
      )}
    </article>
  );
}

function EntryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
