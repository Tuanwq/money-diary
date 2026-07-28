import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Goal,
  Pencil,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./CashFlowForecastPage.css";
import type { DailyEntry, ExpenseBudget, ExpenseEntry } from "../../types";
import { getToday } from "../../utils/date";
import {
  formatMoney,
  formatMoneyInput,
  formatSignedMoney,
  parseMoneyInput,
} from "../../utils/money";
import {
  CASH_FLOW_PLAN_TYPE_LABELS,
  CASH_FLOW_RECURRENCE_LABELS,
  addCashFlowDays,
  buildCashFlowAccountProjections,
  buildCashFlowForecast,
  buildCashFlowSimulation,
  type CashFlowAccountBalance,
  type CashFlowGoalCommitment,
  type CashFlowPlan,
  type CashFlowPlanType,
  type CashFlowRecurrence,
  type CashFlowScenarioId,
  type CashFlowSimulationAdjustment,
} from "./cashFlowForecastModel";
import { CashFlowScenarioBuilder } from "./CashFlowScenarioBuilder";

const PROJECTION_ROWS_PER_PAGE = 10;
const HORIZON_OPTIONS = [7, 14, 30, 60, 90] as const;
const MAX_HORIZON_DAYS = 180;

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("vi-VN", options ?? {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function formatShortDate(value: string) {
  return formatDate(value, { day: "2-digit", month: "2-digit" });
}

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

  return formatMoney(value);
}

function CashFlowPlanForm({
  accounts,
  onClose,
  onSave,
  plan,
}: {
  accounts: CashFlowAccountBalance[];
  onClose: () => void;
  onSave: (plan: CashFlowPlan) => void;
  plan: CashFlowPlan | null;
}) {
  const tomorrow = addCashFlowDays(getToday(), 1);
  const [label, setLabel] = useState(plan?.label ?? "");
  const [type, setType] = useState<CashFlowPlanType>(
    plan?.type ?? "expense"
  );
  const [amount, setAmount] = useState(
    plan ? formatMoneyInput(String(plan.amount)) : ""
  );
  const [startDate, setStartDate] = useState(plan?.startDate ?? tomorrow);
  const [recurrence, setRecurrence] = useState<CashFlowRecurrence>(
    plan?.recurrence ?? "once"
  );
  const [accountId, setAccountId] = useState(plan?.accountId ?? "");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      alert("Bạn chưa nhập tên khoản thu hoặc chi.");
      return;
    }
    if (parsedAmount <= 0) {
      alert("Số tiền phải lớn hơn 0.");
      return;
    }
    if (!startDate) {
      alert("Bạn chưa chọn ngày bắt đầu.");
      return;
    }

    const now = new Date().toISOString();

    onSave({
      ...(accountId ? { accountId } : {}),
      amount: parsedAmount,
      createdAt: plan?.createdAt ?? now,
      enabled: plan?.enabled ?? true,
      id: plan?.id ?? crypto.randomUUID(),
      label: trimmedLabel,
      recurrence,
      startDate,
      type,
      updatedAt: now,
    });
    onClose();
  }

  return (
    <div
      className="cash-flow-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="cash-flow-modal" onSubmit={handleSubmit}>
        <header className="cash-flow-modal-header">
          <div>
            <span>Kế hoạch dòng tiền</span>
            <h2>{plan ? "Chỉnh sửa kế hoạch" : "Thêm khoản dự kiến"}</h2>
            <p>Khoản này sẽ được đưa vào mọi kịch bản dự báo.</p>
          </div>
          <button
            aria-label="Đóng form kế hoạch dòng tiền"
            className="cash-flow-icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="cash-flow-plan-type" role="group" aria-label="Loại kế hoạch">
          {(["income", "expense"] as CashFlowPlanType[]).map((option) => (
            <button
              className={type === option ? "is-active" : ""}
              key={option}
              onClick={() => setType(option)}
              type="button"
            >
              {CASH_FLOW_PLAN_TYPE_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="cash-flow-form-grid">
          <label className="cash-flow-field cash-flow-field-wide">
            <span>Tên khoản dự kiến</span>
            <input
              autoFocus
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={
                type === "income"
                  ? "VD: Nhận lương, khách thanh toán"
                  : "VD: Tiền nhà, trả góp điện thoại"
              }
              value={label}
            />
          </label>

          <label className="cash-flow-field cash-flow-field-wide">
            <span>Tài khoản áp dụng</span>
            <select
              onChange={(event) => setAccountId(event.target.value)}
              value={accountId}
            >
              <option value="">Chưa gắn tài khoản cụ thể</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="cash-flow-field">
            <span>Số tiền</span>
            <div className="cash-flow-money-input">
              <input
                inputMode="numeric"
                onChange={(event) =>
                  setAmount(formatMoneyInput(event.target.value))
                }
                placeholder="VD: 2.000.000"
                value={amount}
              />
              <span>đ</span>
            </div>
          </label>

          <label className="cash-flow-field">
            <span>Ngày bắt đầu</span>
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label className="cash-flow-field cash-flow-field-wide">
            <span>Lặp lại</span>
            <select
              onChange={(event) =>
                setRecurrence(event.target.value as CashFlowRecurrence)
              }
              value={recurrence}
            >
              {(
                Object.entries(CASH_FLOW_RECURRENCE_LABELS) as [
                  CashFlowRecurrence,
                  string,
                ][]
              ).map(([value, labelText]) => (
                <option key={value} value={value}>
                  {labelText}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cash-flow-modal-actions">
          <button
            className="notification-secondary-button"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button className="notification-primary-button" type="submit">
            {plan ? "Lưu thay đổi" : "Thêm vào dự báo"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CashFlowForecastPage({
  accountBalances,
  balanceSource,
  cloudStatus,
  currentBalance,
  deletePlan,
  entries,
  expenseBudgets,
  expenses,
  goalCommitments,
  plans,
  savePlan,
  togglePlan,
}: {
  accountBalances: CashFlowAccountBalance[];
  balanceSource: string;
  cloudStatus: string;
  currentBalance: number;
  deletePlan: (planId: string) => void;
  entries: DailyEntry[];
  expenseBudgets: ExpenseBudget[];
  expenses: ExpenseEntry[];
  goalCommitments: CashFlowGoalCommitment[];
  plans: CashFlowPlan[];
  savePlan: (plan: CashFlowPlan) => void;
  togglePlan: (planId: string) => void;
}) {
  const today = getToday();
  const [horizonDays, setHorizonDays] = useState(30);
  const [isCustomHorizon, setIsCustomHorizon] = useState(false);
  const [customHorizonDays, setCustomHorizonDays] = useState("45");
  const [scenarioId, setScenarioId] =
    useState<CashFlowScenarioId>("realistic");
  const [editingPlan, setEditingPlan] = useState<CashFlowPlan | null>(null);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [projectionPage, setProjectionPage] = useState(1);
  const [simulationAdjustments, setSimulationAdjustments] = useState<
    CashFlowSimulationAdjustment[]
  >([]);
  const accountNameMap = useMemo(
    () => new Map(accountBalances.map((account) => [account.id, account.name])),
    [accountBalances]
  );
  const forecast = useMemo(
    () =>
      buildCashFlowForecast({
        budgets: expenseBudgets,
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
      expenseBudgets,
      expenses,
      goalCommitments,
      horizonDays,
      plans,
      today,
    ]
  );
  const activeScenario =
    forecast.scenarios.find((scenario) => scenario.id === scenarioId) ??
    forecast.scenarios[1];
  const simulationInput = useMemo(
    () => ({ adjustments: simulationAdjustments }),
    [simulationAdjustments]
  );
  const simulation = useMemo(
    () =>
      buildCashFlowSimulation(
        activeScenario,
        currentBalance,
        simulationInput
      ),
    [activeScenario, currentBalance, simulationInput]
  );
  const isSimulationActive = simulation.appliedAdjustmentCount > 0;
  const displayedScenario = isSimulationActive ? simulation : activeScenario;
  const chartData = useMemo(
    () =>
      activeScenario.points.map((point, index) => ({
        ...point,
        simulatedBalance: simulation.points[index]?.balance ?? point.balance,
      })),
    [activeScenario.points, simulation.points]
  );
  const accountProjections = useMemo(
    () =>
      buildCashFlowAccountProjections({
        accounts: accountBalances,
        fromDate: forecast.fromDate,
        plans,
        simulationAdjustments,
        toDate: forecast.toDate,
      }),
    [
      accountBalances,
      forecast.fromDate,
      forecast.toDate,
      plans,
      simulationAdjustments,
    ]
  );
  const projectionTotalPages = Math.max(
    1,
    Math.ceil(displayedScenario.points.length / PROJECTION_ROWS_PER_PAGE)
  );
  const projectionRows = displayedScenario.points.slice(
    (projectionPage - 1) * PROJECTION_ROWS_PER_PAGE,
    projectionPage * PROJECTION_ROWS_PER_PAGE
  );
  const riskDate = displayedScenario.negativeBalanceDate;
  const isLowBalance =
    !riskDate &&
    displayedScenario.lowestBalance >= 0 &&
    displayedScenario.lowestBalance <
      Math.max(currentBalance * 0.2, 500_000);
  const trendContent =
    forecast.trend === "improving"
      ? {
          icon: TrendingUp,
          label: "Nhịp 7 ngày đang tốt hơn 30 ngày",
          tone: "positive",
        }
      : forecast.trend === "slowing"
        ? {
            icon: TrendingDown,
            label: "Nhịp 7 ngày đang chậm hơn 30 ngày",
            tone: "warning",
          }
        : {
            icon: RefreshCcw,
            label:
              forecast.trend === "unknown"
                ? "Chưa đủ dữ liệu để xác định xu hướng"
                : "Nhịp 7 ngày đang ổn định",
            tone: "neutral",
          };
  const TrendIcon = trendContent.icon;

  function openNewPlan() {
    setEditingPlan(null);
    setIsPlanFormOpen(true);
  }

  function confirmDeletePlan(plan: CashFlowPlan) {
    if (
      confirm(
        `Xóa kế hoạch "${plan.label}" khỏi dự báo dòng tiền?`
      )
    ) {
      deletePlan(plan.id);
    }
  }

  function applyHorizonDays(nextDays: number) {
    const safeDays = Math.min(
      Math.max(Math.round(nextDays) || 1, 1),
      MAX_HORIZON_DAYS
    );
    const nextFromDate = addCashFlowDays(today, 1);
    const nextToDate = addCashFlowDays(nextFromDate, safeDays - 1);

    setHorizonDays(safeDays);
    setProjectionPage(1);
    setSimulationAdjustments((current) =>
      current.map((adjustment) => {
        if (adjustment.type === "rest") {
          return {
            ...adjustment,
            startDate:
              adjustment.startDate < nextFromDate ||
              adjustment.startDate > nextToDate
                ? nextFromDate
                : adjustment.startDate,
          };
        }

        if (
          adjustment.type === "income" ||
          adjustment.type === "expense"
        ) {
          return {
            ...adjustment,
            date:
              adjustment.date < nextFromDate ||
              adjustment.date > nextToDate
                ? nextFromDate
                : adjustment.date,
          };
        }

        const startDate =
          adjustment.startDate < nextFromDate ||
          adjustment.startDate > nextToDate
            ? nextFromDate
            : adjustment.startDate;
        const endDate =
          adjustment.endDate < startDate ||
          adjustment.endDate > nextToDate
            ? nextToDate
            : adjustment.endDate;

        return { ...adjustment, endDate, startDate };
      })
    );
  }

  return (
    <div className="cash-flow-page">
      <header className="cash-flow-page-header">
        <div>
          <span className="cash-flow-eyebrow">
            <TrendingUp aria-hidden="true" size={18} />
            Kế hoạch tài chính
          </span>
          <h1>Dự báo dòng tiền</h1>
          <p>
            Ước tính số dư tương lai từ nhịp thu chi gần đây và các khoản đã
            lên lịch.
          </p>
          <small>
            <Cloud aria-hidden="true" size={14} />
            {cloudStatus}
          </small>
        </div>
        <button
          className="notification-primary-button"
          onClick={openNewPlan}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Thêm khoản dự kiến
        </button>
      </header>

      <section className="cash-flow-controls" aria-label="Phạm vi dự báo">
        <div>
          <strong>Khoảng dự báo</strong>
          <span>
            {formatDate(forecast.fromDate)} - {formatDate(forecast.toDate)}
          </span>
        </div>
        <div className="cash-flow-horizon-control">
          <div className="cash-flow-horizon-options">
            {HORIZON_OPTIONS.map((days) => (
              <button
                className={
                  !isCustomHorizon && horizonDays === days
                    ? "is-active"
                    : ""
                }
                key={days}
                onClick={() => {
                  setIsCustomHorizon(false);
                  applyHorizonDays(days);
                }}
                type="button"
              >
                {days} ngày
              </button>
            ))}
            <button
              className={isCustomHorizon ? "is-active" : ""}
              onClick={() => {
                setCustomHorizonDays(String(horizonDays));
                setIsCustomHorizon(true);
              }}
              type="button"
            >
              Tùy chỉnh
            </button>
          </div>
          {isCustomHorizon && (
            <form
              className="cash-flow-custom-horizon"
              onSubmit={(event) => {
                event.preventDefault();
                const nextDays = Number.parseInt(customHorizonDays, 10);

                if (
                  !Number.isFinite(nextDays) ||
                  nextDays < 1 ||
                  nextDays > MAX_HORIZON_DAYS
                ) {
                  alert(
                    `Khoảng dự báo phải từ 1 đến ${MAX_HORIZON_DAYS} ngày.`
                  );
                  return;
                }

                applyHorizonDays(nextDays);
                setCustomHorizonDays(String(nextDays));
              }}
            >
              <label>
                <span>Số ngày dự báo</span>
                <input
                  inputMode="numeric"
                  max={MAX_HORIZON_DAYS}
                  min="1"
                  onChange={(event) =>
                    setCustomHorizonDays(event.target.value)
                  }
                  type="number"
                  value={customHorizonDays}
                />
              </label>
              <button type="submit">Áp dụng</button>
            </form>
          )}
        </div>
      </section>

      <section className="cash-flow-simulation-section">
        <div className="cash-flow-section-heading">
          <div>
            <h2>Thử kịch bản cá nhân</h2>
            <p>
              Kết hợp nhiều điều chỉnh để thử các tình huống khác nhau mà
              không lưu thành giao dịch.
            </p>
          </div>
          <span className={isSimulationActive ? "is-active" : ""}>
            <Sparkles aria-hidden="true" size={15} />
            {isSimulationActive
              ? `${simulation.appliedAdjustmentCount} điều chỉnh đang áp dụng`
              : "Chưa áp dụng"}
          </span>
        </div>

        <CashFlowScenarioBuilder
          accounts={accountBalances}
          adjustments={simulationAdjustments}
          fromDate={forecast.fromDate}
          onChange={setSimulationAdjustments}
          toDate={forecast.toDate}
        />

        <div className="cash-flow-simulation-result" role="status">
          <div>
            <span>Đường cơ sở</span>
            <strong>{formatMoney(activeScenario.projectedBalance)}</strong>
          </div>
          <div>
            <span>Còn lại đến {formatShortDate(forecast.toDate)}</span>
            <strong
              className={
                simulation.projectedBalance < 0
                  ? "is-negative"
                  : "is-positive"
              }
            >
              {formatMoney(simulation.projectedBalance)}
            </strong>
          </div>
          <div>
            <span>Ảnh hưởng</span>
            <strong
              className={
                simulation.baselineDifference < 0
                  ? "is-negative"
                  : "is-positive"
              }
            >
              {formatSignedMoney(simulation.baselineDifference)}
            </strong>
          </div>
          <div>
            <span>Điều chỉnh thu nhập</span>
            <strong
              className={
                simulation.extraIncome - simulation.lostIncome < 0
                  ? "is-negative"
                  : "is-positive"
              }
            >
              {formatSignedMoney(
                simulation.extraIncome - simulation.lostIncome
              )}
            </strong>
          </div>
          <div>
            <span>Chi phí thêm</span>
            <strong className={simulation.extraExpense > 0 ? "is-negative" : ""}>
              {formatMoney(simulation.extraExpense)}
            </strong>
          </div>
        </div>
      </section>

      {(riskDate || isLowBalance) && (
        <section
          className={`cash-flow-alert ${riskDate ? "is-danger" : "is-warning"}`}
          role="status"
        >
          <span>
            <AlertTriangle aria-hidden="true" size={21} />
          </span>
          <div>
            <strong>
              {riskDate
                ? `Có nguy cơ âm tiền từ ${formatDate(riskDate)}`
                : "Số dư dự kiến xuống mức thấp"}
            </strong>
            <p>
              {riskDate
                ? `Theo kịch bản ${displayedScenario.label.toLocaleLowerCase(
                    "vi-VN"
                  )}, các khoản chi có thể vượt số dư hiện có.`
                : `Mức thấp nhất dự kiến là ${formatMoney(
                    displayedScenario.lowestBalance
                  )} vào ${formatDate(displayedScenario.lowestBalanceDate)}.`}
            </p>
          </div>
        </section>
      )}

      <section className="cash-flow-summary" aria-label="Tóm tắt dự báo">
        <div>
          <span>Số dư hiện tại</span>
          <strong>{formatMoney(currentBalance)}</strong>
          <small>
            <WalletCards aria-hidden="true" size={14} />
            {balanceSource}
          </small>
        </div>
        <div>
          <span>Số dư sau {horizonDays} ngày</span>
          <strong
            className={
              displayedScenario.projectedBalance < 0
                ? "is-negative"
                : "is-positive"
            }
          >
            {formatMoney(displayedScenario.projectedBalance)}
          </strong>
          <small>
            {isSimulationActive
              ? "Đã gồm kịch bản thử"
              : `Kịch bản ${activeScenario.label.toLocaleLowerCase("vi-VN")}`}
          </small>
        </div>
        <div>
          <span>Biến động ròng</span>
          <strong
            className={
              displayedScenario.netChange < 0
                ? "is-negative"
                : "is-positive"
            }
          >
            {formatSignedMoney(displayedScenario.netChange)}
          </strong>
          <small>
            Thu {formatMoney(displayedScenario.totalIncome)} · Chi và dành riêng{" "}
            {formatMoney(displayedScenario.totalExpense)}
          </small>
        </div>
        <div>
          <span>Mức thấp nhất</span>
          <strong
            className={
              displayedScenario.lowestBalance < 0 ? "is-negative" : ""
            }
          >
            {formatMoney(displayedScenario.lowestBalance)}
          </strong>
          <small>{formatDate(displayedScenario.lowestBalanceDate)}</small>
        </div>
      </section>

      <section className="cash-flow-scenario-section">
        <div className="cash-flow-section-heading">
          <div>
            <h2>Ba kịch bản dòng tiền</h2>
            <p>
              Khoản đã lên lịch được giữ nguyên; nhịp thu chi thường ngày thay
              đổi theo từng kịch bản.
            </p>
          </div>
          <span className={`cash-flow-trend is-${trendContent.tone}`}>
            <TrendIcon aria-hidden="true" size={16} />
            {trendContent.label}
          </span>
        </div>

        <div className="cash-flow-scenario-grid">
          {forecast.scenarios.map((scenario) => (
            <button
              aria-pressed={scenario.id === scenarioId}
              className={`cash-flow-scenario-card ${
                scenario.id === scenarioId ? "is-active" : ""
              }`}
              key={scenario.id}
              onClick={() => {
                setScenarioId(scenario.id);
                setProjectionPage(1);
              }}
              type="button"
            >
              <span>{scenario.label}</span>
              <strong>{formatMoney(scenario.projectedBalance)}</strong>
              <small
                className={scenario.netChange < 0 ? "is-negative" : "is-positive"}
              >
                {formatSignedMoney(scenario.netChange)}
              </small>
              <em>
                {scenario.negativeBalanceDate
                  ? `Âm tiền từ ${formatShortDate(
                      scenario.negativeBalanceDate
                    )}`
                  : "Không dự báo âm tiền"}
              </em>
            </button>
          ))}
        </div>
      </section>

      <section className="cash-flow-commitment-section">
        <div className="cash-flow-section-heading">
          <div>
            <h2>Cam kết đã đưa vào dự báo</h2>
            <p>
              Mục tiêu được dành riêng theo deadline; ngân sách tạo mức chi dự
              phòng theo tháng.
            </p>
          </div>
          <span>
            {forecast.goalCommitments.length} mục tiêu ·{" "}
            {forecast.budgetEnvelopes.length} ngân sách
          </span>
        </div>

        <div className="cash-flow-commitment-grid">
          <div className="cash-flow-commitment-column">
            <div className="cash-flow-commitment-title">
              <Goal aria-hidden="true" size={17} />
              <strong>Mục tiêu tài chính</strong>
              <span>{formatMoney(forecast.totalGoalReserve)}</span>
            </div>
            {forecast.goalCommitments.length === 0 ? (
              <p className="cash-flow-compact-empty">
                Không còn mục tiêu cần dành thêm tiền.
              </p>
            ) : (
              forecast.goalCommitments.map((commitment) => (
                <div className="cash-flow-commitment-row" key={commitment.id}>
                  <div>
                    <strong>{commitment.label}</strong>
                    <span>
                      {commitment.type === "main" ? "Mục tiêu chính" : "Mục tiêu phụ"} ·
                      hạn {formatDate(commitment.deadline)}
                    </span>
                  </div>
                  <b>{formatMoney(commitment.remaining)}</b>
                </div>
              ))
            )}
          </div>

          <div className="cash-flow-commitment-column">
            <div className="cash-flow-commitment-title">
              <CircleDollarSign aria-hidden="true" size={17} />
              <strong>Ngân sách theo nhãn</strong>
              <span>{formatMoney(forecast.totalBudgetEnvelope)}</span>
            </div>
            {forecast.budgetEnvelopes.length === 0 ? (
              <p className="cash-flow-compact-empty">
                Chưa có ngân sách theo nhãn để đưa vào dự báo.
              </p>
            ) : (
              forecast.budgetEnvelopes.map((budget) => (
                <div className="cash-flow-commitment-row" key={budget.id}>
                  <div>
                    <strong>{budget.label}</strong>
                    <span>
                      Đã chi {formatMoney(budget.spent)} /{" "}
                      {formatMoney(budget.monthlyLimit)}
                    </span>
                  </div>
                  <b>Còn {formatMoney(budget.remaining)}</b>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="cash-flow-main-grid">
        <section className="cash-flow-chart-section">
          <div className="cash-flow-section-heading">
            <div>
              <h2>Đường số dư dự kiến</h2>
              <p>
                Kịch bản {activeScenario.label.toLocaleLowerCase("vi-VN")} ·{" "}
                {horizonDays} ngày tới
                {isSimulationActive ? " · có đường kịch bản thử" : ""}.
              </p>
            </div>
          </div>

          <div className="cash-flow-chart">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={chartData}
                margin={{ bottom: 4, left: 4, right: 12, top: 8 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  minTickGap={22}
                  tickFormatter={formatShortDate}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompactMoney}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value)),
                    name === "balance"
                      ? "Đường cơ sở"
                      : name === "simulatedBalance"
                        ? "Kịch bản thử"
                        : String(name),
                  ]}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                <ReferenceLine stroke="var(--danger)" strokeDasharray="5 5" y={0} />
                <Line
                  dataKey="balance"
                  dot={false}
                  name="balance"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  type="monotone"
                />
                {isSimulationActive && (
                  <Line
                    dataKey="simulatedBalance"
                    dot={false}
                    name="simulatedBalance"
                    stroke="var(--warning)"
                    strokeDasharray="6 4"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="cash-flow-average-section">
          <div className="cash-flow-section-heading">
            <div>
              <h2>Nhịp thu chi gần đây</h2>
              <p>Trung bình ngày, bao gồm cả ngày không phát sinh.</p>
            </div>
          </div>

          <div className="cash-flow-average-table">
            <div className="cash-flow-average-header">
              <span>Khoảng</span>
              <span>Thu/ngày</span>
              <span>Chi/ngày</span>
              <span>Ròng/ngày</span>
            </div>
            {[
              { label: "7 ngày", values: forecast.average7 },
              { label: "30 ngày", values: forecast.average30 },
            ].map((row) => (
              <div className="cash-flow-average-row" key={row.label}>
                <strong>{row.label}</strong>
                <span>{formatMoney(row.values.income)}</span>
                <span>{formatMoney(row.values.expense)}</span>
                <span
                  className={
                    row.values.net < 0 ? "is-negative" : "is-positive"
                  }
                >
                  {formatSignedMoney(row.values.net)}
                </span>
              </div>
            ))}
          </div>

          <div className="cash-flow-planned-summary">
            <div>
              <span>Thu đã lên lịch</span>
              <strong>{formatMoney(forecast.plannedIncome)}</strong>
            </div>
            <div>
              <span>Chi đã lên lịch</span>
              <strong>{formatMoney(forecast.plannedExpense)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="cash-flow-account-section">
        <div className="cash-flow-section-heading">
          <div>
            <h2>Dự báo theo tài khoản</h2>
            <p>
              Phân bổ khoản định kỳ và các điều chỉnh thử đã gắn tài khoản;
              nhịp thu chi chung vẫn nằm ở dự báo tổng.
            </p>
          </div>
        </div>

        {accountProjections.length === 0 ? (
          <div className="cash-flow-empty">
            <WalletCards aria-hidden="true" size={26} />
            <strong>Chưa có số dư tài khoản để phân bổ</strong>
            <span>
              Thêm số dư trong Sổ tài khoản để biết khoản mua sẽ trừ từ đâu.
            </span>
          </div>
        ) : (
          <div className="cash-flow-account-grid">
            {accountProjections.map((account) => (
              <article className="cash-flow-account-item" key={account.id}>
                <div>
                  <span>{account.name}</span>
                  <strong>{formatMoney(account.balance)}</strong>
                </div>
                <ArrowRight aria-hidden="true" size={18} />
                <div>
                  <span>Sau khoản đã phân bổ</span>
                  <strong
                    className={
                      account.projectedBalance < 0
                        ? "is-negative"
                        : "is-positive"
                    }
                  >
                    {formatMoney(account.projectedBalance)}
                  </strong>
                </div>
                <small
                  className={
                    account.plannedChange < 0
                      ? "is-negative"
                      : "is-positive"
                  }
                >
                  {formatSignedMoney(account.plannedChange)}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cash-flow-plan-section">
        <div className="cash-flow-section-heading">
          <div>
            <h2>Khoản định kỳ và dự kiến</h2>
            <p>
              Lịch thanh toán, trả góp và nguồn tiền chắc chắn trong tương lai.
            </p>
          </div>
          <button
            className="notification-secondary-button"
            onClick={openNewPlan}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Thêm kế hoạch
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="cash-flow-empty">
            <CalendarDays aria-hidden="true" size={27} />
            <strong>Chưa có khoản nào được lên lịch</strong>
            <span>
              Thêm tiền nhà, hóa đơn, lương hoặc khoản thu dự kiến để kết quả
              sát thực tế hơn.
            </span>
            <button
              className="notification-primary-button"
              onClick={openNewPlan}
              type="button"
            >
              <Plus aria-hidden="true" size={17} />
              Thêm khoản đầu tiên
            </button>
          </div>
        ) : (
          <div className="cash-flow-plan-list">
            {plans.map((plan) => (
              <article
                className={`cash-flow-plan-item ${
                  plan.enabled ? "" : "is-disabled"
                }`}
                key={plan.id}
              >
                <span
                  className={`cash-flow-plan-icon is-${plan.type}`}
                  aria-hidden="true"
                >
                  {plan.type === "income" ? (
                    <TrendingUp size={19} />
                  ) : (
                    <TrendingDown size={19} />
                  )}
                </span>
                <div className="cash-flow-plan-copy">
                  <div>
                    <strong>{plan.label}</strong>
                    <span>{CASH_FLOW_RECURRENCE_LABELS[plan.recurrence]}</span>
                  </div>
                  <p>
                    Từ {formatDate(plan.startDate)} ·{" "}
                    {CASH_FLOW_PLAN_TYPE_LABELS[plan.type]}
                    {plan.accountId
                      ? ` · ${
                          accountNameMap.get(plan.accountId) ??
                          "Tài khoản đã ẩn"
                        }`
                      : ""}
                  </p>
                </div>
                <strong
                  className={`cash-flow-plan-amount is-${plan.type}`}
                >
                  {plan.type === "income" ? "+" : "−"}
                  {formatMoney(plan.amount)}
                </strong>
                <div className="cash-flow-plan-actions">
                  <button
                    aria-label={
                      plan.enabled
                        ? `Tạm dừng ${plan.label}`
                        : `Bật ${plan.label}`
                    }
                    className={`cash-flow-toggle ${
                      plan.enabled ? "is-active" : ""
                    }`}
                    onClick={() => togglePlan(plan.id)}
                    role="switch"
                    aria-checked={plan.enabled}
                    type="button"
                  >
                    <span />
                  </button>
                  <button
                    aria-label={`Sửa ${plan.label}`}
                    className="cash-flow-icon-button"
                    onClick={() => {
                      setEditingPlan(plan);
                      setIsPlanFormOpen(true);
                    }}
                    type="button"
                  >
                    <Pencil aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`Xóa ${plan.label}`}
                    className="cash-flow-icon-button is-danger"
                    onClick={() => confirmDeletePlan(plan)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cash-flow-projection-section">
        <div className="cash-flow-section-heading">
          <div>
            <h2>Chi tiết theo ngày</h2>
            <p>
              Các khoản lịch sử dự kiến và khoản đã lên lịch trong từng ngày.
            </p>
          </div>
          <span>
            {displayedScenario.points.length} ngày · {displayedScenario.label}
          </span>
        </div>

        <div className="cash-flow-projection-table">
          <div className="cash-flow-projection-header">
            <span>Ngày</span>
            <span>Thu dự kiến</span>
            <span>Chi dự kiến</span>
            <span>Thay đổi</span>
            <span>Số dư cuối ngày</span>
          </div>
          {projectionRows.map((point) => (
            <div className="cash-flow-projection-row" key={point.date}>
              <strong>{formatDate(point.date)}</strong>
              <span className="is-positive">{formatMoney(point.income)}</span>
              <span className="is-negative">{formatMoney(point.expense)}</span>
              <span className={point.net < 0 ? "is-negative" : "is-positive"}>
                {formatSignedMoney(point.net)}
              </span>
              <strong className={point.balance < 0 ? "is-negative" : ""}>
                {formatMoney(point.balance)}
              </strong>
            </div>
          ))}
        </div>

        {projectionTotalPages > 1 && (
          <div className="cash-flow-pagination">
            <button
              aria-label="Trang dự báo trước"
              disabled={projectionPage === 1}
              onClick={() => setProjectionPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span>
              Trang {projectionPage}/{projectionTotalPages}
            </span>
            <button
              aria-label="Trang dự báo sau"
              disabled={projectionPage === projectionTotalPages}
              onClick={() =>
                setProjectionPage((page) =>
                  Math.min(projectionTotalPages, page + 1)
                )
              }
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
        )}
      </section>

      <section className="cash-flow-method-note">
        <span>
          <CircleDollarSign aria-hidden="true" size={19} />
        </span>
        <div>
          <strong>Cách dự báo được tính</strong>
          <p>
            Kịch bản thực tế dùng 65% nhịp 7 ngày và 35% nhịp 30 ngày. Kịch bản
            thận trọng giảm 20% thu, tăng 15% chi; kịch bản tích cực tăng 15%
            thu, giảm 10% chi. Ngân sách là mức chi dự phòng, mục tiêu là tiền
            cần dành riêng; khoản định kỳ được cộng đúng lịch. Đây là ước tính
            hỗ trợ lập kế hoạch, không phải số tiền chắc chắn.
          </p>
        </div>
        <CheckCircle2 aria-hidden="true" size={18} />
      </section>

      {isPlanFormOpen && (
        <CashFlowPlanForm
          accounts={accountBalances}
          onClose={() => {
            setIsPlanFormOpen(false);
            setEditingPlan(null);
          }}
          onSave={savePlan}
          plan={editingPlan}
        />
      )}
    </div>
  );
}
