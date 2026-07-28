import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeAlert,
  CalendarRange,
  CircleDollarSign,
  Gauge,
  GitCompareArrows,
  ListTree,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  DailyEntry,
  ExpenseEntry,
  Goals,
  Page,
} from "../types";
import {
  buildCashFlowForecast,
  buildCashFlowSimulation,
  type CashFlowGoalCommitment,
  type CashFlowPlan,
  type CashFlowSimulationAdjustment,
} from "../features/cash-flow/cashFlowForecastModel";
import type {
  AiFinanceActionPlanItem,
  AiFinanceAnalysis,
  AiFinanceAnomaly,
  AiFinanceMetric,
} from "../utils/aiFinanceAnalysis";
import { formatDateShort } from "../utils/date";
import { formatMoney } from "../utils/money";

type NavigateHandler = (page: Page, date?: string) => void;

const METRIC_ICONS = {
  activeDays: CalendarRange,
  expense: WalletCards,
  incomePerHour: Gauge,
  net: CircleDollarSign,
  requiredPace: Route,
  topOtherExpense: ListTree,
  workIncome: ArrowUpRight,
} satisfies Record<AiFinanceMetric["key"], typeof CircleDollarSign>;

function getMetricTone(metric: AiFinanceMetric) {
  if (Math.abs(metric.changePercent ?? 0) <= 1) return "neutral";

  const isIncrease = metric.changeValue > 0;
  const isPositive = metric.positiveWhenUp ? isIncrease : !isIncrease;

  return isPositive ? "positive" : "negative";
}

export function FinanceComparisonView({
  analysis,
}: {
  analysis: AiFinanceAnalysis;
}) {
  const [selectedMetricKey, setSelectedMetricKey] =
    useState<AiFinanceMetric["key"]>("net");
  const selectedMetric =
    analysis.metrics.find((metric) => metric.key === selectedMetricKey) ??
    analysis.metrics[0];

  return (
    <div className="ai-finance-analysis-view">
      <section className="ai-finance-summary-panel">
        <span aria-hidden="true">
          <GitCompareArrows size={19} />
        </span>
        <div>
          <small>So sánh với kỳ liền trước</small>
          <p>{analysis.summary}</p>
          <p className="ai-finance-comparison-copy">
            {analysis.comparisonSummary}
          </p>
        </div>
      </section>

      <section
        className="ai-finance-metric-grid"
        aria-label="Chỉ số tài chính và thay đổi so với kỳ trước"
      >
        {analysis.metrics.map((metric) => {
          const Icon = METRIC_ICONS[metric.key];
          const tone = getMetricTone(metric);
          const ChangeIcon =
            metric.changeValue > 0
              ? ArrowUpRight
              : metric.changeValue < 0
                ? ArrowDownRight
                : GitCompareArrows;

          return (
            <button
              aria-pressed={selectedMetricKey === metric.key}
              className={`ai-finance-metric-card is-${tone} ${
                selectedMetricKey === metric.key ? "is-selected" : ""
              }`}
              key={metric.key}
              onClick={() => setSelectedMetricKey(metric.key)}
              type="button"
            >
              <div className="ai-finance-metric-heading">
                <span aria-hidden="true">
                  <Icon size={16} />
                </span>
                <small>{metric.label}</small>
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
              <div className="ai-finance-metric-comparison">
                <span className={`is-${tone}`}>
                  <ChangeIcon aria-hidden="true" size={13} />
                  {metric.changeLabel}
                </span>
                <small>Kỳ trước: {formatMetricPreviousValue(metric)}</small>
              </div>
            </button>
          );
        })}
      </section>

      {selectedMetric && (
        <section className="ai-finance-source-panel">
          <header>
            <div>
              <span aria-hidden="true">
                <ListTree size={17} />
              </span>
              <div>
                <h3>Nguồn tạo ra “{selectedMetric.label}”</h3>
                <p>
                  Bấm chỉ số khác để xem đúng thành phần đã tạo ra con số đó.
                </p>
              </div>
            </div>
            <span>
              {formatDateShort(analysis.fromDate)} -{" "}
              {formatDateShort(analysis.toDate)}
            </span>
          </header>

          <div className="ai-finance-source-list">
            {selectedMetric.sources.length > 0 ? (
              selectedMetric.sources.map((source) => (
                <div key={`${selectedMetric.key}-${source.label}`}>
                  <span className={`is-${source.tone}`}>{source.label}</span>
                  <strong>{source.value}</strong>
                  {source.share > 0 && <small>{source.share}%</small>}
                </div>
              ))
            ) : (
              <p>Chưa có nguồn dữ liệu trong kỳ này.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function formatMetricPreviousValue(metric: AiFinanceMetric) {
  if (metric.key === "activeDays") return `${metric.previousValue} ngày`;
  return formatMoney(metric.previousValue);
}

export function FinanceAnomalyView({
  anomalies,
  onNavigate,
}: {
  anomalies: AiFinanceAnomaly[];
  onNavigate?: NavigateHandler;
}) {
  return (
    <section className="ai-finance-decision-view">
      <header className="ai-finance-decision-heading">
        <div>
          <span aria-hidden="true">
            <BadgeAlert size={18} />
          </span>
          <div>
            <h3>Bất thường cần xử lý</h3>
            <p>Mỗi cảnh báo đều chỉ rõ nguyên nhân và nơi sửa dữ liệu.</p>
          </div>
        </div>
        <strong>{anomalies.length}</strong>
      </header>

      {anomalies.length === 0 ? (
        <div className="ai-finance-empty-state">
          <ShieldCheck aria-hidden="true" size={28} />
          <div>
            <strong>Chưa phát hiện bất thường rõ ràng</strong>
            <p>Dữ liệu trong phạm vi đang xem không có lỗi đáng chú ý.</p>
          </div>
        </div>
      ) : (
        <div className="ai-finance-anomaly-list">
          {anomalies.map((anomaly) => (
            <article
              className={`ai-finance-anomaly-item is-${anomaly.severity}`}
              key={anomaly.id}
            >
              <span aria-hidden="true">
                <BadgeAlert size={18} />
              </span>
              <div>
                <header>
                  <h4>{anomaly.title}</h4>
                  {anomaly.date && (
                    <small>{formatDateShort(anomaly.date)}</small>
                  )}
                </header>
                <p>{anomaly.detail}</p>
              </div>
              <button
              disabled={!onNavigate}
                onClick={() =>
                  onNavigate?.(anomaly.actionPage, anomaly.date)
                }
                type="button"
              >
                {anomaly.actionLabel}
                <ArrowRight aria-hidden="true" size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function FinanceActionPlanView({
  items,
  onNavigate,
}: {
  items: AiFinanceActionPlanItem[];
  onNavigate?: NavigateHandler;
}) {
  return (
    <section className="ai-finance-decision-view">
      <header className="ai-finance-decision-heading">
        <div>
          <span aria-hidden="true">
            <Route size={18} />
          </span>
          <div>
            <h3>Kế hoạch hành động</h3>
            <p>Mục tiêu được quy đổi thành tiền, giờ hoặc số đơn cụ thể.</p>
          </div>
        </div>
        <strong>{items.length}</strong>
      </header>

      <div className="ai-finance-action-grid">
        {items.map((item, index) => (
          <article key={item.id}>
            <header>
              <span>{index + 1}</span>
              <h4>{item.title}</h4>
            </header>
            <strong>{item.target}</strong>
            <p>{item.detail}</p>
            <small>{item.impact}</small>
            <button
              disabled={!onNavigate}
              onClick={() => onNavigate?.(item.actionPage)}
              type="button"
            >
              {item.actionLabel}
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function FinanceSimulationView({
  currentBalance,
  entries,
  expenses,
  goalCommitments,
  goals,
  onNavigate,
  plans,
  today,
}: {
  currentBalance: number;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goalCommitments: CashFlowGoalCommitment[];
  goals: Goals;
  onNavigate?: NavigateHandler;
  plans: CashFlowPlan[];
  today: string;
}) {
  const [horizonDays, setHorizonDays] = useState(30);
  const [restDays, setRestDays] = useState(0);
  const [extraExpenseInput, setExtraExpenseInput] = useState("");
  const [extraIncomeInput, setExtraIncomeInput] = useState("");
  const forecast = useMemo(
    () =>
      buildCashFlowForecast({
        budgets: goals.expenseBudgets ?? [],
        currentBalance,
        entries,
        expenses,
        goalCommitments,
        horizonDays,
        plans,
        today,
      }),
    [
      currentBalance,
      entries,
      expenses,
      goalCommitments,
      goals.expenseBudgets,
      horizonDays,
      plans,
      today,
    ]
  );
  const baseline =
    forecast.scenarios.find((scenario) => scenario.id === "realistic") ??
    forecast.scenarios[0];
  const simulation = useMemo(() => {
    const adjustments: CashFlowSimulationAdjustment[] = [];
    const extraExpense = parseMoneyInput(extraExpenseInput);
    const extraIncome = parseMoneyInput(extraIncomeInput);

    if (restDays > 0) {
      adjustments.push({
        days: restDays,
        id: "analysis-rest",
        label: `Nghỉ ${restDays} ngày`,
        startDate: forecast.fromDate,
        type: "rest",
      });
    }
    if (extraExpense > 0) {
      adjustments.push({
        amount: extraExpense,
        date: forecast.fromDate,
        id: "analysis-expense",
        label: "Khoản mua dự kiến",
        type: "expense",
      });
    }
    if (extraIncome > 0) {
      adjustments.push({
        amount: extraIncome,
        date: forecast.fromDate,
        id: "analysis-income",
        label: "Thu nhập dự kiến",
        type: "income",
      });
    }

    return buildCashFlowSimulation(baseline, currentBalance, {
      adjustments,
    });
  }, [
    baseline,
    currentBalance,
    extraExpenseInput,
    extraIncomeInput,
    forecast.fromDate,
    restDays,
  ]);
  const difference = simulation.projectedBalance - baseline.projectedBalance;

  return (
    <section className="ai-finance-decision-view">
      <header className="ai-finance-decision-heading">
        <div>
          <span aria-hidden="true">
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <h3>Mô phỏng dòng tiền</h3>
            <p>Thử thay đổi mà không lưu thành giao dịch thực tế.</p>
          </div>
        </div>
        <span className="ai-finance-simulation-status">
          {simulation.appliedAdjustmentCount > 0
            ? `${simulation.appliedAdjustmentCount} thay đổi`
            : "Đường cơ sở"}
        </span>
      </header>

      <div className="ai-finance-simulation-presets">
        <button type="button" onClick={() => setRestDays(3)}>
          Nếu nghỉ 3 ngày
        </button>
        <button
          type="button"
          onClick={() => setExtraExpenseInput("5000000")}
        >
          Nếu chi 5 triệu
        </button>
        <button
          type="button"
          onClick={() => setExtraIncomeInput("2000000")}
        >
          Nếu thu thêm 2 triệu
        </button>
        <button
          type="button"
          onClick={() => {
            setRestDays(0);
            setExtraExpenseInput("");
            setExtraIncomeInput("");
          }}
        >
          Đặt lại
        </button>
      </div>

      <div className="ai-finance-simulation-fields">
        <label>
          <span>Khoảng dự báo</span>
          <select
            value={horizonDays}
            onChange={(event) => setHorizonDays(Number(event.target.value))}
          >
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={60}>60 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </label>
        <label>
          <span>Số ngày nghỉ</span>
          <input
            inputMode="numeric"
            max={30}
            min={0}
            onChange={(event) =>
              setRestDays(
                Math.min(Math.max(Number(event.target.value) || 0, 0), 30)
              )
            }
            type="number"
            value={restDays}
          />
        </label>
        <label>
          <span>Khoản chi dự kiến</span>
          <div>
            <input
              inputMode="numeric"
              onChange={(event) => setExtraExpenseInput(event.target.value)}
              placeholder="VD: 5.000.000"
              type="text"
              value={extraExpenseInput}
            />
            <b>đ</b>
          </div>
        </label>
        <label>
          <span>Thu nhập thêm</span>
          <div>
            <input
              inputMode="numeric"
              onChange={(event) => setExtraIncomeInput(event.target.value)}
              placeholder="VD: 2.000.000"
              type="text"
              value={extraIncomeInput}
            />
            <b>đ</b>
          </div>
        </label>
      </div>

      <div className="ai-finance-simulation-results">
        <div>
          <span>Số dư hiện tại</span>
          <strong>{formatMoney(currentBalance)}</strong>
        </div>
        <div>
          <span>Đường cơ sở</span>
          <strong>{formatMoney(baseline.projectedBalance)}</strong>
          <small>Đến {formatDateShort(forecast.toDate)}</small>
        </div>
        <div>
          <span>Sau mô phỏng</span>
          <strong>{formatMoney(simulation.projectedBalance)}</strong>
          <small>
            Thấp nhất {formatMoney(simulation.lowestBalance)}
          </small>
        </div>
        <div className={difference >= 0 ? "is-positive" : "is-negative"}>
          <span>Ảnh hưởng</span>
          <strong>
            {difference >= 0 ? "+" : "-"}
            {formatMoney(Math.abs(difference))}
          </strong>
          <small>
            {simulation.negativeBalanceDate
              ? `Âm tiền từ ${formatDateShort(
                  simulation.negativeBalanceDate
                )}`
              : "Chưa dự báo âm tiền"}
          </small>
        </div>
      </div>

      <div className="ai-finance-simulation-footer">
        <p>
          Mô phỏng đã tính cả mục tiêu, ngân sách nhãn và khoản thu/chi định kỳ
          đang bật.
        </p>
        <button
          disabled={!onNavigate}
          onClick={() => onNavigate?.("cashFlow")}
          type="button"
        >
          Mở dự báo đầy đủ
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      </div>
    </section>
  );
}
