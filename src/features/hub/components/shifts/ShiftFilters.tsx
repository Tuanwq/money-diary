import type { ReactNode } from "react";
import { CalendarSearch, Filter } from "lucide-react";
import { HUB_TYPE_LABEL, HUB_TYPES } from "../../../../constants/hanoiHub";
import { getToday } from "../../../../utils/date";
import type { HubCalendarDay, HubTimeFilter, HubTypeFilter } from "../work/types";
import { ShiftCalendar } from "./ShiftCalendar";
import { ShiftFilterSummary } from "./ShiftFilterSummary";

type ShiftFiltersProps = {
  hubType: HubTypeFilter;
  timeFilter: HubTimeFilter;
  customFromDate: string;
  customToDate: string;
  calendarMonth: string;
  calendarDays: HubCalendarDay[];
  resultCount: number;
  resultIncome: number;
  resultOrders: number;
  resultHours: number;
  rangeLabel: string;
  onHubTypeChange: (value: HubTypeFilter) => void;
  onTimeFilterChange: (value: HubTimeFilter) => void;
  onCustomFromDateChange: (value: string) => void;
  onCustomToDateChange: (value: string) => void;
  onSelectDate: (date: string) => void;
  onCalendarMonthChange: (amount: number) => void;
  isDateSelected: (date: string) => boolean;
};

const TIME_FILTERS: Array<{ label: string; value: HubTimeFilter }> = [
  { label: "3 ngày gần nhất", value: "last3" },
  { label: "Hôm nay", value: "today" },
  { label: "Tuần trước", value: "previousWeek" },
  { label: "Tuần này", value: "thisWeek" },
  { label: "Tháng này", value: "thisMonth" },
  { label: "Tháng trước", value: "previousMonth" },
  { label: "Tùy chỉnh", value: "custom" },
];

const MOBILE_TIME_FILTERS = TIME_FILTERS.filter((filter) => filter.value !== "last3");

function FilterChips({
  title,
  scroll = false,
  children,
}: {
  title: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="hub-shift-filter-group">
      <span>{title}</span>
      <div className={`hub-filter-chips${scroll ? " hub-filter-chips--scroll" : ""}`}>{children}</div>
    </div>
  );
}

function HubFilters({
  value,
  scroll,
  onChange,
}: {
  value: HubTypeFilter;
  scroll?: boolean;
  onChange: (value: HubTypeFilter) => void;
}) {
  return (
    <FilterChips title="Lọc theo Hub" scroll={scroll}>
      {(["ALL", ...HUB_TYPES] as HubTypeFilter[]).map((hubType) => (
        <button
          key={hubType}
          type="button"
          aria-pressed={value === hubType}
          className={value === hubType ? "is-active" : ""}
          onClick={() => onChange(hubType)}
        >
          {hubType === "ALL" ? "Tất cả" : HUB_TYPE_LABEL[hubType]}
        </button>
      ))}
    </FilterChips>
  );
}

function TimeFilters({
  value,
  options,
  scroll,
  onChange,
}: {
  value: HubTimeFilter;
  options: typeof TIME_FILTERS;
  scroll?: boolean;
  onChange: (value: HubTimeFilter) => void;
}) {
  return (
    <FilterChips title="Lọc theo thời gian" scroll={scroll}>
      {options.map((filter) => (
        <button
          key={filter.value}
          type="button"
          aria-pressed={value === filter.value}
          className={value === filter.value ? "is-active" : ""}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </FilterChips>
  );
}

function CustomDateFields({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}) {
  return (
    <div className="hub-form-grid hub-form-grid--two">
      <label className="hub-field">
        <span>Từ ngày</span>
        <input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} />
      </label>
      <label className="hub-field">
        <span>Đến ngày</span>
        <input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} />
      </label>
    </div>
  );
}

export function ShiftFilters(props: ShiftFiltersProps) {
  const today = getToday();
  const hubLabel = props.hubType === "ALL" ? "Tất cả Hub" : HUB_TYPE_LABEL[props.hubType];
  const showTodayAction =
    props.calendarMonth !== today.slice(0, 7) ||
    props.timeFilter !== "today";

  return (
    <section className="hub-shift-filters">
      <div className="hub-shift-filters__layout">
        <ShiftCalendar
          month={props.calendarMonth}
          days={props.calendarDays}
          today={today}
          showTodayAction={showTodayAction}
          isDateSelected={props.isDateSelected}
          onChangeMonth={props.onCalendarMonthChange}
          onSelectDate={props.onSelectDate}
          onGoToday={() => props.onTimeFilterChange("today")}
        />

        <div className="hub-shift-filters__controls">
          <ShiftFilterSummary
            rangeLabel={props.rangeLabel}
            hubLabel={hubLabel}
            count={props.resultCount}
            income={props.resultIncome}
            orders={props.resultOrders}
            hours={props.resultHours}
          />

          <div className="hub-shift-filters__mobile-controls">
            <HubFilters value={props.hubType} scroll onChange={props.onHubTypeChange} />
            <TimeFilters value={props.timeFilter} options={MOBILE_TIME_FILTERS} scroll onChange={props.onTimeFilterChange} />

            <details className="hub-mobile-filter-sheet" open={props.timeFilter === "custom" || undefined}>
              <summary><Filter size={17} aria-hidden="true" />Bộ lọc chi tiết<span>{props.resultCount} ca</span></summary>
              <div>
                <TimeFilters value={props.timeFilter} options={[TIME_FILTERS[0]]} onChange={props.onTimeFilterChange} />
                <label className="hub-field">
                  <span>Nhảy nhanh đến ngày</span>
                  <span className="hub-date-jump-input">
                    <CalendarSearch size={17} aria-hidden="true" />
                    <input
                      type="date"
                      value={props.customFromDate}
                      onChange={(event) => {
                        if (event.target.value) props.onSelectDate(event.target.value);
                      }}
                    />
                  </span>
                </label>
                {props.timeFilter === "custom" && (
                  <CustomDateFields
                    fromDate={props.customFromDate}
                    toDate={props.customToDate}
                    onFromDateChange={props.onCustomFromDateChange}
                    onToDateChange={props.onCustomToDateChange}
                  />
                )}
              </div>
            </details>
          </div>

          <div className="hub-shift-filters__desktop-controls">
            <HubFilters value={props.hubType} onChange={props.onHubTypeChange} />
            <TimeFilters value={props.timeFilter} options={TIME_FILTERS} onChange={props.onTimeFilterChange} />
            {props.timeFilter === "custom" && (
              <CustomDateFields
                fromDate={props.customFromDate}
                toDate={props.customToDate}
                onFromDateChange={props.onCustomFromDateChange}
                onToDateChange={props.onCustomToDateChange}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
