import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Banknote,
  BriefcaseBusiness,
  Clock3,
  Filter,
  PackageCheck,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { HUB_TYPE_LABEL, HUB_TYPES } from "../../../../constants/hanoiHub";
import type {
  HubAnalyticsSummary,
  HubPerformanceItem,
  HubReport,
} from "../../../../utils/hubAnalytics";
import type { HubChangeLog } from "../../../../types/hub";
import { formatMoney } from "../../../../utils/money";
import { HubEmptyState, HubMetricStrip, HubTabHeader } from "../shared";
import type {
  HubStatisticsRange,
  HubTypeFilter,
} from "../work/types";

type HubStatisticsPageProps = {
  range: HubStatisticsRange;
  hubFilter: HubTypeFilter;
  customFromDate: string;
  customToDate: string;
  rangeLabel: string;
  summary: HubAnalyticsSummary;
  todaySummary: HubAnalyticsSummary;
  weekSummary: HubAnalyticsSummary;
  monthSummary: HubAnalyticsSummary;
  hubPerformance: HubPerformanceItem[];
  shiftPerformance: HubPerformanceItem[];
  lowPerformanceShifts: HubPerformanceItem[];
  weeklyReport: HubReport;
  monthlyReport: HubReport;
  changeLogs: HubChangeLog[];
  currentLogPage: number;
  totalLogPages: number;
  pageSize: number;
  onRangeChange: (range: HubStatisticsRange) => void;
  onHubFilterChange: (filter: HubTypeFilter) => void;
  onCustomFromDateChange: (value: string) => void;
  onCustomToDateChange: (value: string) => void;
  onOpenShifts: () => void;
  onUndoChange: (log: HubChangeLog) => void;
  onRestoreChange: (entry: NonNullable<HubChangeLog["previousEntry"]>) => void;
  onLogPageChange: (page: number) => void;
};

const RANGE_OPTIONS: Array<{ label: string; value: HubStatisticsRange }> = [
  { label: "7 ngày", value: "last7" },
  { label: "14 ngày", value: "last14" },
  { label: "30 ngày", value: "last30" },
  { label: "Tháng này", value: "thisMonth" },
  { label: "Tùy chỉnh", value: "custom" },
];

function formatHours(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)} giờ`;
}

function StatisticsFilters({
  range,
  hubFilter,
  customFromDate,
  customToDate,
  onRangeChange,
  onHubFilterChange,
  onCustomFromDateChange,
  onCustomToDateChange,
}: Pick<
  HubStatisticsPageProps,
  | "range"
  | "hubFilter"
  | "customFromDate"
  | "customToDate"
  | "onRangeChange"
  | "onHubFilterChange"
  | "onCustomFromDateChange"
  | "onCustomToDateChange"
>) {
  const activeRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label ?? "Bộ lọc";
  const filterFields = (
    <>
      <div className="hub-statistics-filters__group">
        <span>Khoảng thời gian</span>
        <div className="hub-filter-chips">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={range === option.value ? "is-active" : ""}
              aria-pressed={range === option.value}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <label className="hub-field hub-statistics-filters__hub">
        <span>Hub</span>
        <select value={hubFilter} onChange={(event) => onHubFilterChange(event.target.value as HubTypeFilter)}>
          <option value="ALL">Tất cả Hub</option>
          {HUB_TYPES.map((hubType) => (
            <option value={hubType} key={hubType}>{HUB_TYPE_LABEL[hubType]}</option>
          ))}
        </select>
      </label>
      {range === "custom" && (
        <div className="hub-statistics-filters__dates">
          <label className="hub-field">
            <span>Từ ngày</span>
            <input type="date" value={customFromDate} onChange={(event) => onCustomFromDateChange(event.target.value)} />
          </label>
          <label className="hub-field">
            <span>Đến ngày</span>
            <input type="date" value={customToDate} onChange={(event) => onCustomToDateChange(event.target.value)} />
          </label>
        </div>
      )}
    </>
  );

  return (
    <section className="hub-statistics-filters" aria-label="Bộ lọc thống kê">
      <div className="hub-statistics-filters__desktop">
        {filterFields}
      </div>
      <details className="hub-mobile-filter-sheet hub-statistics-filters__mobile">
        <summary><Filter size={17} aria-hidden="true" />Bộ lọc thống kê<span>{activeRangeLabel}</span></summary>
        <div>{filterFields}</div>
      </details>
    </section>
  );
}

function PeriodComparison({
  today,
  week,
  month,
}: {
  today: HubAnalyticsSummary;
  week: HubAnalyticsSummary;
  month: HubAnalyticsSummary;
}) {
  const periods = [
    { label: "Hôm nay", summary: today },
    { label: "Tuần này", summary: week },
    { label: "Tháng này", summary: month },
  ];

  return (
    <section className="hub-period-comparison" aria-label="So sánh theo kỳ">
      {periods.map(({ label, summary }) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{formatMoney(summary.workIncome)}</strong>
          <small>{summary.shifts} ca · {summary.orders} đơn · {formatHours(summary.hours)}</small>
        </div>
      ))}
    </section>
  );
}

function PerformanceChart({
  title,
  description,
  items,
  metric,
}: {
  title: string;
  description: string;
  items: HubPerformanceItem[];
  metric: "workIncome" | "incomePerHour";
}) {
  const visibleItems = items.slice(0, 6);
  const maxValue = Math.max(...visibleItems.map((item) => item[metric]), 1);

  return (
    <section className="hub-feature-section hub-performance-chart">
      <div className="hub-feature-section__heading">
        <BarChart3 size={19} aria-hidden="true" />
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {visibleItems.length === 0 ? (
        <HubEmptyState title="Chưa đủ dữ liệu" description="Cần thêm ca làm để bắt đầu so sánh hiệu suất." />
      ) : (
        <div className="hub-performance-chart__rows" role="list">
          {visibleItems.map((item) => {
            const value = item[metric];
            const width = `${Math.max((value / maxValue) * 100, 3)}%`;
            return (
              <div key={item.key} role="listitem">
                <div className="hub-performance-chart__label">
                  <span>{item.label}</span>
                  <strong>{formatMoney(value)}{metric === "incomePerHour" ? "/giờ" : ""}</strong>
                </div>
                <div className="hub-performance-chart__track" aria-hidden="true">
                  <span style={{ width }} />
                </div>
                <small>{item.shifts} ca · {item.orders} đơn · {formatHours(item.hours)}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatisticsInsights({
  hubPerformance,
  shiftPerformance,
  report,
}: {
  hubPerformance: HubPerformanceItem[];
  shiftPerformance: HubPerformanceItem[];
  report: HubReport;
}) {
  const bestHub = hubPerformance[0];
  const bestShift = shiftPerformance[0];
  const trend = report.changePercent;

  return (
    <section className="hub-feature-section hub-statistics-insights">
      <div className="hub-feature-section__heading">
        <TrendingUp size={19} aria-hidden="true" />
        <div>
          <h3>Điểm đáng chú ý</h3>
          <p>Chỉ tổng hợp từ các ca thuộc phạm vi lọc hiện tại.</p>
        </div>
      </div>
      {hubPerformance.length === 0 ? (
        <HubEmptyState title="Chưa có insight" description="Phạm vi đang chọn chưa có ca làm để phân tích." />
      ) : (
        <dl className="hub-statistics-insights__grid">
          <div><dt>Hub hiệu quả nhất</dt><dd>{bestHub?.label ?? "Chưa đủ dữ liệu"}</dd></div>
          <div><dt>Khung giờ hiệu quả nhất</dt><dd>{bestShift?.label ?? "Chưa đủ dữ liệu"}</dd></div>
          <div><dt>Ngày tốt nhất tuần</dt><dd>{report.bestDay ? `${report.bestDay.date} · ${formatMoney(report.bestDay.workIncome)}` : "Chưa đủ dữ liệu"}</dd></div>
          <div>
            <dt>Xu hướng tuần</dt>
            <dd className={trend === null || trend === 0 ? "" : trend > 0 ? "is-positive" : "is-negative"}>
              {trend === null ? "Chưa có kỳ trước" : trend === 0 ? "Không đổi" : `${trend > 0 ? "Tăng" : "Giảm"} ${Math.abs(trend)}%`}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function ReportPanel({ report }: { report: HubReport }) {
  const trendIcon = report.changePercent !== null && report.changePercent < 0 ? ArrowDownRight : ArrowUpRight;
  const TrendIcon = trendIcon;
  const changeText = report.changePercent === null
    ? "Chưa có kỳ trước để so sánh"
    : `${report.changePercent >= 0 ? "Tăng" : "Giảm"} ${Math.abs(report.changePercent)}% so với kỳ trước`;

  return (
    <section className="hub-feature-section hub-report-panel">
      <div className="hub-report-panel__header">
        <div><h3>{report.title}</h3><p>{report.fromDate} - {report.toDate}</p></div>
        <TrendIcon size={20} aria-hidden="true" />
      </div>
      <strong className="hub-report-panel__income">{formatMoney(report.summary.workIncome)}</strong>
      <p className="hub-report-panel__trend">{changeText}</p>
      <dl>
        <div><dt>Số ca</dt><dd>{report.summary.shifts}</dd></div>
        <div><dt>Số đơn</dt><dd>{report.summary.orders}</dd></div>
        <div><dt>Số giờ</dt><dd>{formatHours(report.summary.hours)}</dd></div>
      </dl>
      <div className="hub-report-panel__notes">
        {report.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
    </section>
  );
}

function HubChangeHistory({
  logs,
  currentPage,
  totalPages,
  pageSize,
  onUndo,
  onRestore,
  onPageChange,
}: {
  logs: HubChangeLog[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onUndo: (log: HubChangeLog) => void;
  onRestore: (entry: NonNullable<HubChangeLog["previousEntry"]>) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="hub-feature-section hub-change-history">
      <div className="hub-feature-section__heading">
        <RotateCcw size={19} aria-hidden="true" />
        <div><h3>Lịch sử thay đổi Hub</h3><p>Tối đa {pageSize} bản ghi mỗi trang, có thể hoàn tác khi dữ liệu còn phù hợp.</p></div>
      </div>
      {logs.length === 0 ? (
        <HubEmptyState title="Chưa có lịch sử thay đổi" description="Các lần thêm, sửa và xóa ca sẽ xuất hiện tại đây." />
      ) : (
        <div className="hub-change-history__list">
          {logs.map((log) => (
            <article key={log.id}>
              <div>
                <h4>{log.title}</h4>
                <p>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.createdAt))} · {log.description}</p>
              </div>
              <div className="hub-change-history__actions">
                <button type="button" onClick={() => onUndo(log)}>Hoàn tác</button>
                {log.action === "delete" && log.previousEntry && (
                  <button type="button" onClick={() => onRestore(log.previousEntry!)}>Khôi phục</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <nav className="hub-pagination" aria-label="Phân trang lịch sử thay đổi Hub">
          <span>Trang {currentPage}/{totalPages}</span>
          <div>
            <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Trước</button>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Sau</button>
          </div>
        </nav>
      )}
    </section>
  );
}

export function HubStatisticsPage(props: HubStatisticsPageProps) {
  const {
    summary,
    todaySummary,
    weekSummary,
    monthSummary,
    hubPerformance,
    shiftPerformance,
    lowPerformanceShifts,
    weeklyReport,
    monthlyReport,
  } = props;

  return (
    <section className="hub-feature-page hub-statistics-page">
      <HubTabHeader
        icon={BarChart3}
        title="Thống kê Hub"
        description="Theo dõi thu nhập, số ca, đơn hàng và hiệu suất theo thời gian."
        action={<button type="button" className="hub-secondary-action" onClick={props.onOpenShifts}>Xem ca của tôi</button>}
      />
      <StatisticsFilters {...props} />
      <p className="hub-statistics-range-label">Đang xem: <strong>{props.rangeLabel}</strong></p>
      <HubMetricStrip
        ariaLabel="Tổng quan thống kê Hub"
        items={[
          { label: "Tổng thu nhập", value: formatMoney(summary.workIncome), icon: Banknote, tone: "income" },
          { label: "Tổng số ca", value: `${summary.shifts} ca`, icon: BriefcaseBusiness },
          { label: "Tổng giờ", value: formatHours(summary.hours), icon: Clock3 },
          { label: "Tổng đơn", value: `${summary.orders} đơn`, icon: PackageCheck },
          { label: "Trung bình mỗi giờ", value: `${formatMoney(summary.incomePerHour)}/giờ`, icon: TrendingUp },
        ]}
      />
      <PeriodComparison today={todaySummary} week={weekSummary} month={monthSummary} />
      <div className="hub-statistics-charts">
        <PerformanceChart title="Thu nhập theo Hub" description="So sánh tiền làm được thật trong phạm vi lọc." items={hubPerformance} metric="workIncome" />
        <PerformanceChart title="Hiệu suất theo ca" description="So sánh thu nhập trung bình mỗi giờ theo Hub và khung giờ." items={shiftPerformance} metric="incomePerHour" />
      </div>
      <StatisticsInsights hubPerformance={hubPerformance} shiftPerformance={shiftPerformance} report={weeklyReport} />
      <section className="hub-feature-section hub-low-performance">
        <div className="hub-feature-section__heading">
          <TrendingUp size={19} aria-hidden="true" />
          <div><h3>Cảnh báo hiệu suất thấp</h3><p>Ca có ít nhất hai lần làm và tiền/giờ thấp hơn 75% trung bình chung.</p></div>
        </div>
        {lowPerformanceShifts.length === 0 ? (
          <p className="hub-status-message is-success">Chưa phát hiện ca nào thấp bất thường.</p>
        ) : (
          <div className="hub-low-performance__list">
            {lowPerformanceShifts.map((item) => (
              <div key={item.key}><span><strong>{item.label}</strong><small>{item.shifts} ca · {item.orders} đơn · {formatHours(item.hours)}</small></span><strong>{formatMoney(item.incomePerHour)}/giờ</strong></div>
            ))}
          </div>
        )}
      </section>
      <div className="hub-report-grid"><ReportPanel report={weeklyReport} /><ReportPanel report={monthlyReport} /></div>
      <HubChangeHistory
        logs={props.changeLogs}
        currentPage={props.currentLogPage}
        totalPages={props.totalLogPages}
        pageSize={props.pageSize}
        onUndo={props.onUndoChange}
        onRestore={props.onRestoreChange}
        onPageChange={props.onLogPageChange}
      />
    </section>
  );
}
