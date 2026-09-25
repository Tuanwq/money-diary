import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ReceiptText,
  Scale,
  Target,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AccountTransaction,
  FinancialAccount,
} from "../account-ledger/accountLedgerModel";
import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../../types";
import type { HubEntry, HubSettings } from "../../types/hub";
import { formatDateShort, getToday } from "../../utils/date";
import { formatMoney } from "../../utils/money";
import {
  buildAnalyticsDateRange,
  buildFinancialAnalyticsModel,
  getAnalyticsAllDates,
  type AnalyticsDailyPoint,
  type AnalyticsMetric,
  type AnalyticsPeriod,
} from "./financialAnalyticsModel";
import "./FinancialAnalyticsPage.css";

type FinancialAnalyticsPageProps = {
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  actualMoney: number;
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  goalAchievedAmount: number;
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
};

type KpiDefinition = {
  icon: ComponentType<{ "aria-hidden"?: boolean | "true"; size?: number }>;
  label: string;
  lowerIsBetter?: boolean;
  metric: AnalyticsMetric;
  value: string;
};

const PERIOD_OPTIONS: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Tháng này", value: "thisMonth" },
  { label: "90 ngày", value: "90d" },
  { label: "Toàn bộ", value: "all" },
  { label: "Tùy chỉnh", value: "custom" },
];

function formatCompactMoney(value: number) {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} tỷ`;
  }

  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} tr`;
  }

  if (absolute >= 1_000) {
    return `${(value / 1_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 0,
    })}k`;
  }

  return value.toLocaleString("vi-VN");
}

function formatRange(fromDate: string, toDate: string) {
  return `${formatDateShort(fromDate)} - ${formatDateShort(toDate)}`;
}

function aggregateChartPoints(points: AnalyticsDailyPoint[]) {
  if (points.length <= 120) return points;

  const grouped = new Map<string, AnalyticsDailyPoint>();

  for (const point of points) {
    const month = point.date.slice(0, 7);
    const current = grouped.get(month) ?? {
      bonus: 0,
      date: month,
      expense: 0,
      hours: 0,
      hubProfit: 0,
      income: 0,
      label: `${month.slice(5)}/${month.slice(0, 4)}`,
      net: 0,
      orders: 0,
      received: 0,
      workIncome: 0,
    };

    current.bonus += point.bonus;
    current.expense += point.expense;
    current.hours += point.hours;
    current.hubProfit += point.hubProfit;
    current.income += point.income;
    current.net += point.net;
    current.orders += point.orders;
    current.received += point.received;
    current.workIncome += point.workIncome;
    grouped.set(month, current);
  }

  return [...grouped.values()];
}

function hasChartValues(
  points: Array<Record<string, unknown>>,
  keys: string[]
) {
  return points.some((point) =>
    keys.some((key) => Number(point[key] ?? 0) !== 0)
  );
}

function KpiCard({
  definition,
}: {
  definition: KpiDefinition;
}) {
  const { changePercent } = definition.metric;
  const isNew = changePercent === null;
  const favorable =
    changePercent !== null &&
    (definition.lowerIsBetter ? changePercent <= 0 : changePercent >= 0);
  const Icon = definition.icon;
  const TrendIcon =
    changePercent !== null && changePercent < 0
      ? ArrowDownRight
      : ArrowUpRight;

  return (
    <article className="analytics-kpi-card">
      <header>
        <span className="analytics-kpi-card__icon">
          <Icon aria-hidden="true" size={17} />
        </span>
        <span>{definition.label}</span>
      </header>
      <strong>{definition.value}</strong>
      <footer>
        <span
          className={`analytics-kpi-card__change ${
            favorable ? "is-positive" : "is-negative"
          } ${isNew ? "is-neutral" : ""}`}
        >
          {!isNew && <TrendIcon aria-hidden="true" size={14} />}
          {isNew
            ? "Chưa có kỳ trước"
            : `${Math.abs(changePercent)}% so với kỳ trước`}
        </span>
      </footer>
    </article>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="analytics-empty-state">
      <BarChart3 aria-hidden="true" size={24} />
      <span>{message}</span>
    </div>
  );
}

export function FinancialAnalyticsPage({
  accounts,
  accountTransactions,
  actualMoney,
  balanceChecks,
  completedGoals,
  entries,
  expenses,
  goals,
  goalAchievedAmount,
  hubEntries,
  hubSettings,
}: FinancialAnalyticsPageProps) {
  const today = getToday();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [customFromDate, setCustomFromDate] = useState(today);
  const [customToDate, setCustomToDate] = useState(today);
  const allDates = useMemo(
    () =>
      getAnalyticsAllDates({
        accountTransactions,
        hubEntries,
      }),
    [accountTransactions, hubEntries]
  );
  const range = useMemo(
    () =>
      buildAnalyticsDateRange({
        allDates,
        customFromDate,
        customToDate,
        period,
        today,
      }),
    [allDates, customFromDate, customToDate, period, today]
  );
  const model = useMemo(
    () =>
      buildFinancialAnalyticsModel({
        accounts,
        actualMoney,
        balanceChecks,
        completedGoals,
        goals,
        goalAchievedAmount,
        hubEntries,
        hubSettings,
        range,
        transactions: accountTransactions,
      }),
    [
      accounts,
      accountTransactions,
      actualMoney,
      balanceChecks,
      completedGoals,
      goals,
      goalAchievedAmount,
      hubEntries,
      hubSettings,
      range,
    ]
  );
  const trendPoints = useMemo(
    () => aggregateChartPoints(model.dailyPoints),
    [model.dailyPoints]
  );
  const kpis: KpiDefinition[] = [
    {
      icon: CircleDollarSign,
      label: "Tổng thu nhập",
      metric: model.metrics.income,
      value: formatMoney(model.metrics.income.value),
    },
    {
      icon: WalletCards,
      label: "Dòng tiền ròng",
      metric: model.metrics.net,
      value: formatMoney(model.metrics.net.value),
    },
    {
      icon: ReceiptText,
      label: "Tổng chi tiêu",
      lowerIsBetter: true,
      metric: model.metrics.expense,
      value: formatMoney(model.metrics.expense.value),
    },
    {
      icon: Clock3,
      label: "Giờ làm",
      metric: model.metrics.hours,
      value: `${model.metrics.hours.value.toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      })} giờ`,
    },
    {
      icon: PackageCheck,
      label: "Đơn hoàn thành",
      metric: model.metrics.orders,
      value: `${model.metrics.orders.value.toLocaleString("vi-VN")} đơn`,
    },
    {
      icon: BarChart3,
      label: "Lợi nhuận Hub",
      metric: model.metrics.hubProfit,
      value: formatMoney(model.metrics.hubProfit.value),
    },
  ];
  const latestDifference = model.latestBalanceCheck?.difference ?? 0;

  return (
    <section className="financial-analytics-page">
      <header className="financial-analytics-header">
        <div>
          <span className="financial-analytics-eyebrow">
            <BarChart3 aria-hidden="true" size={16} />
            Toàn cảnh thành tích
          </span>
          <h1>Thống kê tổng hợp</h1>
          <p>
            Thu nhập, chi tiêu, ca Hub, tài khoản và mục tiêu trên cùng một màn
            hình.
          </p>
        </div>
        <div className="financial-analytics-header__range">
          <CalendarRange aria-hidden="true" size={18} />
          <span>
            <small>{range.label}</small>
            <strong>{formatRange(range.fromDate, range.toDate)}</strong>
          </span>
        </div>
      </header>

      {(entries.length > 0 || expenses.length > 0) && <p className="analytics-legacy-notice">
        {entries.length + expenses.length} bản ghi thu/chi cũ chưa được đối chiếu với tài khoản.
        Thống kê tài chính chỉ tính giao dịch trong Sổ tài khoản để tránh cộng trùng.
      </p>}

      <section className="analytics-filter-bar" aria-label="Chọn khoảng thống kê">
        <div className="analytics-period-options">
          {PERIOD_OPTIONS.map((option) => (
            <button
              className={period === option.value ? "is-active" : ""}
              key={option.value}
              onClick={() => setPeriod(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="analytics-custom-range">
            <label>
              <span>Từ ngày</span>
              <input
                max={customToDate || today}
                onChange={(event) => setCustomFromDate(event.target.value)}
                type="date"
                value={customFromDate}
              />
            </label>
            <label>
              <span>Đến ngày</span>
              <input
                max={today}
                min={customFromDate}
                onChange={(event) => setCustomToDate(event.target.value)}
                type="date"
                value={customToDate}
              />
            </label>
          </div>
        )}
      </section>

      <section className="analytics-kpi-grid" aria-label="Chỉ số chính">
        {kpis.map((definition) => (
          <KpiCard definition={definition} key={definition.label} />
        ))}
      </section>

      <section className="analytics-context-strip" aria-label="Chỉ số bổ sung">
        <div>
          <span>Ngày có dữ liệu</span>
          <strong>
            {model.activeDays}/{model.dailyPoints.length}
          </strong>
        </div>
        <div>
          <span>Ca Hub</span>
          <strong>{model.hubSummary.shifts} ca</strong>
        </div>
        <div>
          <span>Số dư tài khoản</span>
          <strong>{formatMoney(model.accountTotal)}</strong>
        </div>
        <div>
          <span>Mục tiêu hoàn thành</span>
          <strong>{model.completedGoals} mục tiêu</strong>
        </div>
        <div>
          <span>Lệch kiểm kê gần nhất</span>
          <strong
            className={
              latestDifference === 0
                ? ""
                : latestDifference > 0
                  ? "is-positive"
                  : "is-negative"
            }
          >
            {model.latestBalanceCheck
              ? formatMoney(latestDifference)
              : "Chưa kiểm kê"}
          </strong>
        </div>
      </section>

      <div className="analytics-dashboard-grid">
        <section className="analytics-panel analytics-panel--trend">
          <header className="analytics-panel__header">
            <div>
              <h2>Xu hướng dòng tiền</h2>
              <p>Thu nhập, chi tiêu và số tiền ròng theo thời gian.</p>
            </div>
            <span>
              {model.dailyPoints.length > 120 ? "Theo tháng" : "Theo ngày"}
            </span>
          </header>
          <div className="analytics-chart analytics-chart--large">
            {hasChartValues(
              trendPoints as unknown as Array<Record<string, unknown>>,
              ["income", "expense", "net"]
            ) ? (
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                  data={trendPoints}
                  margin={{ bottom: 0, left: 0, right: 8, top: 10 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    minTickGap={24}
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickFormatter={formatCompactMoney}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatMoney(Number(value ?? 0)),
                      name === "income"
                        ? "Thu nhập"
                        : name === "expense"
                          ? "Chi tiêu"
                          : "Ròng",
                    ]}
                    labelStyle={{ color: "var(--text-primary)" }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "income"
                        ? "Thu nhập"
                        : value === "expense"
                          ? "Chi tiêu"
                          : "Ròng"
                    }
                  />
                  <Area
                    dataKey="income"
                    fill="#C9D9CB"
                    fillOpacity={0.72}
                    name="income"
                    stroke="#557A5B"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Area
                    dataKey="expense"
                    fill="#F3D7D7"
                    fillOpacity={0.55}
                    name="expense"
                    stroke="#C74343"
                    strokeWidth={1.8}
                    type="monotone"
                  />
                  <Area
                    dataKey="net"
                    fill="#C8DCE8"
                    fillOpacity={0.18}
                    name="net"
                    stroke="#3E6F8E"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState message="Chưa có thu nhập hoặc chi tiêu trong khoảng này." />
            )}
          </div>
        </section>

        <section className="analytics-panel analytics-panel--expense">
          <header className="analytics-panel__header">
            <div>
              <h2>Cơ cấu chi tiêu</h2>
              <p>Tỷ trọng theo bữa ăn và nhãn khoản khác.</p>
            </div>
          </header>
          {model.expenseCategories.length > 0 ? (
            <>
              <div className="analytics-donut">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={model.expenseCategories}
                      dataKey="value"
                      innerRadius="60%"
                      nameKey="name"
                      outerRadius="88%"
                      paddingAngle={2}
                    >
                      {model.expenseCategories.map((category) => (
                        <Cell fill={category.color} key={category.name} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="analytics-donut__center">
                  <small>Tổng chi</small>
                  <strong>{formatCompactMoney(model.totals.expense)}</strong>
                </div>
              </div>
              <div className="analytics-expense-legend">
                {model.expenseCategories.map((category) => (
                  <div key={category.name}>
                    <i style={{ background: category.color }} />
                    <span>{category.name}</span>
                    <strong>{category.percentage}%</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ChartEmptyState message="Chưa có chi tiêu trong khoảng này." />
          )}
        </section>

        <section className="analytics-panel analytics-panel--hub">
          <header className="analytics-panel__header">
            <div>
              <h2>Hiệu suất theo Hub</h2>
              <p>Lợi nhuận thực sau khi trừ chi phí vận hành.</p>
            </div>
            <span>{formatMoney(model.hubSummary.actualProfitPerHour)}/giờ</span>
          </header>
          <div className="analytics-chart">
            {model.hubPerformance.length > 0 ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={model.hubPerformance}
                  layout="vertical"
                  margin={{ bottom: 0, left: 0, right: 12, top: 4 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickFormatter={formatCompactMoney}
                    tickLine={false}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="label"
                    tick={{ fill: "var(--text-primary)", fontSize: 12 }}
                    tickLine={false}
                    type="category"
                    width={64}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatMoney(Number(value ?? 0)),
                      name === "actualProfit" ? "Lợi nhuận thực" : "Tiền làm",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "actualProfit" ? "Lợi nhuận thực" : "Tiền làm"
                    }
                  />
                  <Bar
                    dataKey="workIncome"
                    fill="#C9D9CB"
                    name="workIncome"
                    radius={[0, 5, 5, 0]}
                  />
                  <Bar
                    dataKey="actualProfit"
                    fill="#557A5B"
                    name="actualProfit"
                    radius={[0, 5, 5, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState message="Chưa có ca Hub trong khoảng này." />
            )}
          </div>
        </section>

        <section className="analytics-panel analytics-panel--weekday">
          <header className="analytics-panel__header">
            <div>
              <h2>Hiệu suất theo thứ</h2>
              <p>Trung bình mỗi ngày có dữ liệu của từng thứ.</p>
            </div>
          </header>
          <div className="analytics-chart">
            {model.activeDays > 0 ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={model.weekdayPerformance}
                  margin={{ bottom: 0, left: 0, right: 8, top: 4 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickFormatter={formatCompactMoney}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatMoney(Number(value ?? 0)),
                      name === "income" ? "Thu nhập TB" : "Ròng TB",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "income" ? "Thu nhập TB" : "Ròng TB"
                    }
                  />
                  <Bar
                    dataKey="income"
                    fill="#C9D9CB"
                    name="income"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="net"
                    fill="#3E6F8E"
                    name="net"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState message="Chưa đủ dữ liệu để so sánh theo thứ." />
            )}
          </div>
        </section>

        <section className="analytics-panel analytics-panel--goals">
          <header className="analytics-panel__header">
            <div>
              <h2>Tiến độ mục tiêu</h2>
              <p>Mục tiêu chính và các khoản đang dành riêng.</p>
            </div>
            <Target aria-hidden="true" size={20} />
          </header>
          <div className="analytics-goal-list">
            {model.goals.length > 0 ? (
              model.goals.slice(0, 6).map((goal) => (
                <article
                  className={`analytics-goal-row ${
                    goal.type === "main" ? "is-main" : ""
                  }`}
                  key={goal.id}
                >
                  <div>
                    <span>{goal.name}</span>
                    <strong>{goal.progress}%</strong>
                  </div>
                  <div className="analytics-progress-track">
                    <i style={{ width: `${goal.progress}%` }} />
                  </div>
                  <small>
                    {formatCompactMoney(goal.current)} /{" "}
                    {formatCompactMoney(goal.target)}
                    {goal.deadline
                      ? ` · Hạn ${formatDateShort(goal.deadline)}`
                      : ""}
                  </small>
                </article>
              ))
            ) : (
              <ChartEmptyState message="Chưa có mục tiêu tài chính." />
            )}
          </div>
        </section>

        <section className="analytics-panel analytics-panel--accounts">
          <header className="analytics-panel__header">
            <div>
              <h2>Phân bổ số dư</h2>
              <p>Số dư hiện tại trong từng tài khoản.</p>
            </div>
            <strong>{formatMoney(model.accountTotal)}</strong>
          </header>
          <div className="analytics-account-list">
            {model.accounts.length > 0 ? (
              model.accounts.map((account) => {
                const maxBalance = Math.max(
                  ...model.accounts.map((item) => Math.abs(item.balance)),
                  1
                );
                const width = Math.round(
                  (Math.abs(account.balance) / maxBalance) * 100
                );

                return (
                  <article key={account.id}>
                    <div>
                      <span>{account.name}</span>
                      <strong
                        className={account.balance < 0 ? "is-negative" : ""}
                      >
                        {formatMoney(account.balance)}
                      </strong>
                    </div>
                    <div className="analytics-account-track">
                      <i
                        className={account.balance < 0 ? "is-negative" : ""}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </article>
                );
              })
            ) : (
              <ChartEmptyState message="Chưa có dữ liệu sổ tài khoản." />
            )}
          </div>
        </section>

        <section className="analytics-panel analytics-panel--ranking">
          <header className="analytics-panel__header">
            <div>
              <h2>Ngày hiệu quả nhất</h2>
              <p>Xếp hạng theo dòng tiền ròng trong khoảng đang xem.</p>
            </div>
            <CheckCircle2 aria-hidden="true" size={20} />
          </header>
          {model.topDays.length > 0 ? (
            <div className="analytics-ranking-table">
              <div className="analytics-ranking-table__head">
                <span>Ngày</span>
                <span>Thu</span>
                <span>Chi</span>
                <span>Ròng</span>
              </div>
              {model.topDays.map((day, index) => (
                <div className="analytics-ranking-table__row" key={day.date}>
                  <span>
                    <b>{index + 1}</b>
                    {formatDateShort(day.date)}
                  </span>
                  <span>{formatCompactMoney(day.income)}</span>
                  <span>{formatCompactMoney(day.expense)}</span>
                  <strong className={day.net < 0 ? "is-negative" : ""}>
                    {formatCompactMoney(day.net)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <ChartEmptyState message="Chưa có ngày nào đủ dữ liệu để xếp hạng." />
          )}
        </section>

        <section className="analytics-panel analytics-panel--summary">
          <header className="analytics-panel__header">
            <div>
              <h2>Tổng hợp nguồn tiền</h2>
              <p>Phân loại từ giao dịch thu đã ghi trong Sổ tài khoản.</p>
            </div>
            <Scale aria-hidden="true" size={20} />
          </header>
          <div className="analytics-income-breakdown">
            {model.incomeCategories.map((category) => (
              <div key={category.name}>
                <span>{category.name}</span>
                <strong>{formatMoney(category.value)}</strong>
              </div>
            ))}
            <div className="is-total">
              <span>Tổng thu nhập</span>
              <strong>{formatMoney(model.totals.income)}</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
