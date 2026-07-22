import { BriefcaseBusiness, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { HUB_TYPE_LABEL } from "../../../../constants/hanoiHub";
import type { HubEntry, HubSettings } from "../../../../types/hub";
import { calculateHubIncome } from "../../../../utils/hubIncome";
import { ShiftResultCard } from "../../../shifts/components/ShiftResultCard";
import { HubEmptyState, HubTabHeader } from "../shared";
import type {
  HubCalendarDay,
  HubTimeFilter,
  HubTypeFilter,
} from "../work/types";
import { ShiftFilters } from "./ShiftFilters";

type MyShiftsPageProps = {
  entries: HubEntry[];
  settings: HubSettings;
  expandedShiftIds: Set<string>;
  hubTypeFilter: HubTypeFilter;
  timeFilter: HubTimeFilter;
  customFromDate: string;
  customToDate: string;
  calendarMonth: string;
  calendarDays: HubCalendarDay[];
  rangeLabel: string;
  onAdd: () => void;
  onEdit: (entry: HubEntry) => void;
  onRequestDelete: (entry: HubEntry) => void;
  onToggle: (id: string) => void;
  onHubTypeFilterChange: (value: HubTypeFilter) => void;
  onTimeFilterChange: (value: HubTimeFilter) => void;
  onCustomFromDateChange: (value: string) => void;
  onCustomToDateChange: (value: string) => void;
  onSelectDate: (date: string) => void;
  onCalendarMonthChange: (amount: number) => void;
  isDateSelected: (date: string) => boolean;
  getDurationHours: (shiftName: string) => number;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function MyShiftsPage(props: MyShiftsPageProps) {
  const { entries, getDurationHours, settings } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const visibleEntries = useMemo(() => {
    const query = normalize(searchQuery.trim());
    if (!query) return entries;
    return entries.filter((entry) => normalize(`${entry.date} ${HUB_TYPE_LABEL[entry.hubType]} ${entry.shiftName} ${entry.note}`).includes(query));
  }, [entries, searchQuery]);
  const summary = useMemo(() => visibleEntries.reduce((total, entry) => {
    const income = calculateHubIncome(entry, settings);
    return {
      income: total.income + income.total,
      orders: total.orders + entry.order,
      hours: total.hours + getDurationHours(entry.shiftName),
    };
  }, { income: 0, orders: 0, hours: 0 }), [getDurationHours, settings, visibleEntries]);

  return (
    <section className="hub-feature-page hub-my-shifts-page">
      <HubTabHeader
        icon={BriefcaseBusiness}
        title="Ca của tôi"
        description="Tìm, lọc và quản lý các ca Hub đã lưu."
        action={<button type="button" className="hub-primary-action" onClick={props.onAdd}><Plus size={17} aria-hidden="true" />Thêm ca mới</button>}
      />
      <label className="hub-shift-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Tìm kiếm ca Hub</span>
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm theo ngày, Hub, khung giờ hoặc ghi chú" />
      </label>
      <ShiftFilters
        hubType={props.hubTypeFilter}
        timeFilter={props.timeFilter}
        customFromDate={props.customFromDate}
        customToDate={props.customToDate}
        calendarMonth={props.calendarMonth}
        calendarDays={props.calendarDays}
        resultCount={visibleEntries.length}
        resultIncome={summary.income}
        resultOrders={summary.orders}
        resultHours={summary.hours}
        rangeLabel={props.rangeLabel}
        onHubTypeChange={props.onHubTypeFilterChange}
        onTimeFilterChange={props.onTimeFilterChange}
        onCustomFromDateChange={props.onCustomFromDateChange}
        onCustomToDateChange={props.onCustomToDateChange}
        onSelectDate={props.onSelectDate}
        onCalendarMonthChange={props.onCalendarMonthChange}
        isDateSelected={props.isDateSelected}
      />
      <section className="hub-shifts-results" aria-label="Các ca phù hợp">
        {visibleEntries.length === 0 ? (
          <HubEmptyState
            title="Không tìm thấy ca phù hợp"
            description="Hãy đổi từ khóa, bộ lọc hoặc thêm một ca làm mới."
            action={<button type="button" className="hub-primary-action" onClick={props.onAdd}>Thêm ca mới</button>}
          />
        ) : (
          <div className="hub-shifts-results__list">
            {visibleEntries.map((entry) => (
              <ShiftResultCard
                key={entry.id}
                durationHours={props.getDurationHours(entry.shiftName)}
                entry={entry}
                income={calculateHubIncome(entry, props.settings)}
                isExpanded={props.expandedShiftIds.has(entry.id)}
                onEdit={props.onEdit}
                onRequestDelete={props.onRequestDelete}
                onToggle={props.onToggle}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
