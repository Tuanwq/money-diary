import { BriefcaseBusiness, CalendarDays, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { HUB_TYPE_LABEL } from "../../../../constants/hanoiHub";
import type { HubEntry, HubSettings } from "../../../../types/hub";
import { formatReportDate } from "../../../../utils/date";
import {
  calculateHubIncome,
  calculateHubIncomeByEntry,
} from "../../../../utils/hubIncome";
import { getHubOperatingCostTotal } from "../../../../utils/hubProfit";
import { formatMoney } from "../../../../utils/money";
import { ShiftResultCard } from "../../../shifts/components/ShiftResultCard";
import { HubEmptyState, HubTabHeader } from "../shared";
import type {
  HubCalendarDay,
  HubTimeFilter,
  HubTypeFilter,
} from "../work/types";
import { ShiftFilters } from "./ShiftFilters";

type MyShiftsPageProps = {
  allEntries: HubEntry[];
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
  const { allEntries, entries, getDurationHours, settings } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const incomeByEntry = useMemo(
    () => calculateHubIncomeByEntry(allEntries, settings),
    [allEntries, settings]
  );
  const visibleEntries = useMemo(() => {
    const query = normalize(searchQuery.trim());
    if (!query) return entries;
    return entries.filter((entry) => normalize(`${entry.date} ${HUB_TYPE_LABEL[entry.hubType]} ${entry.shiftName} ${entry.note}`).includes(query));
  }, [entries, searchQuery]);
  const summary = useMemo(() => visibleEntries.reduce((total, entry) => {
    const income =
      incomeByEntry.get(entry.id) ?? calculateHubIncome(entry, settings);
    const operatingCost = getHubOperatingCostTotal(entry);
    return {
      income: total.income + income.total,
      operatingCost: total.operatingCost + operatingCost,
      actualProfit: total.actualProfit + income.total - operatingCost,
      orders: total.orders + entry.order,
      hours: total.hours + getDurationHours(entry.shiftName),
    };
  }, {
    income: 0,
    operatingCost: 0,
    actualProfit: 0,
    orders: 0,
    hours: 0,
  }), [getDurationHours, incomeByEntry, settings, visibleEntries]);
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, HubEntry[]>();

    visibleEntries.forEach((entry) => {
      const dateEntries = groups.get(entry.date) ?? [];
      dateEntries.push(entry);
      groups.set(entry.date, dateEntries);
    });

    return Array.from(groups.entries()).map(([date, dateEntries]) => {
      const dateIncome = dateEntries.reduce(
        (total, entry) => {
          const income =
            incomeByEntry.get(entry.id) ??
            calculateHubIncome(entry, settings);
          const operatingCost = getHubOperatingCostTotal(entry);

          return {
            grossIncome: total.grossIncome + income.total,
            actualProfit:
              total.actualProfit + income.total - operatingCost,
            hours: total.hours + getDurationHours(entry.shiftName),
            orders: total.orders + entry.order,
          };
        },
        { actualProfit: 0, grossIncome: 0, hours: 0, orders: 0 }
      );
      const dailyEntries = allEntries.filter((entry) => entry.date === date);
      const dailyRewards = dailyEntries.reduce(
        (total, entry) => {
          const income =
            incomeByEntry.get(entry.id) ??
            calculateHubIncome(entry, settings);

          return {
            region: total.region + income.weekdayRegionReward,
            sunday: total.sunday + income.sundayReward,
          };
        },
        { region: 0, sunday: 0 }
      );

      return { date, entries: dateEntries, ...dateIncome, ...dailyRewards };
    });
  }, [
    allEntries,
    getDurationHours,
    incomeByEntry,
    settings,
    visibleEntries,
  ]);

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
        resultOperatingCost={summary.operatingCost}
        resultActualProfit={summary.actualProfit}
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
            {groupedEntries.map((group) => (
              <section className="hub-shift-day-group" key={group.date}>
                <header className="hub-shift-day-group__header">
                  <span className="hub-shift-day-group__icon">
                    <CalendarDays aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <h3>{formatReportDate(group.date)}</h3>
                    <p>
                      {group.entries.length} ca · {group.orders} đơn ·{" "}
                      {new Intl.NumberFormat("vi-VN", {
                        maximumFractionDigits: 1,
                      }).format(group.hours)}{" "}
                      giờ
                    </p>
                  </div>
                  <div className="hub-shift-day-group__total">
                    <span>Lợi nhuận trong ngày</span>
                    <strong>{formatMoney(group.actualProfit)}</strong>
                    <small>Tổng thu {formatMoney(group.grossIncome)}</small>
                  </div>
                  {(group.sunday > 0 || group.region > 0) && (
                    <div className="hub-shift-day-group__reward">
                      <span>
                        {group.sunday > 0
                          ? "Thưởng Chủ nhật"
                          : "Thưởng khu vực"}
                      </span>
                      <strong>
                        {formatMoney(group.sunday || group.region)}
                      </strong>
                      <small>Tổng đơn hợp lệ trong ngày, không gồm Hub 1</small>
                    </div>
                  )}
                </header>
                <div className="hub-shift-day-group__list">
                  {group.entries.map((entry) => (
                    <ShiftResultCard
                      key={entry.id}
                      durationHours={props.getDurationHours(entry.shiftName)}
                      entry={entry}
                      income={
                        incomeByEntry.get(entry.id) ??
                        calculateHubIncome(entry, props.settings)
                      }
                      isExpanded={props.expandedShiftIds.has(entry.id)}
                      onEdit={props.onEdit}
                      onRequestDelete={props.onRequestDelete}
                      onToggle={props.onToggle}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
