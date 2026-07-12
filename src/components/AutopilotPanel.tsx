import { useMemo, useState } from "react";
import {
  DEFAULT_HUB_SETTINGS,
  STORAGE_HUB_CALCULATOR_KEY,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "../constants/hanoiHub";
import type { BalanceCheckEntry, DailyEntry, ExpenseEntry, Goals } from "../types";
import type { HubEntry, HubSettings } from "../types/hub";
import {
  buildAutopilotDashboard,
  type AutopilotGoal,
  type AutopilotGoalStatus,
} from "../utils/autopilot";
import { formatDateShort } from "../utils/date";
import { formatMoney } from "../utils/money";
import {
  buildMoneyRadar,
  type MoneyRadar,
  type MoneyRadarDailyAudit,
  type MoneyRadarSeverity,
} from "../utils/moneyRadar";
import { ProgressBar } from "./ProgressBar";

type AutopilotPanelProps = {
  actualMoney: number;
  balanceChecks: BalanceCheckEntry[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  navigateToGoals: () => void;
  navigateToHub: () => void;
  today: string;
};

function loadLocalJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;

    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function getStatusClass(status: AutopilotGoalStatus) {
  if (status === "reached") return "bg-green-50 text-green-700";
  if (status === "onTrack") return "bg-slate-900 text-white";
  if (status === "behind") return "bg-amber-50 text-amber-700";
  if (status === "critical") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function formatTargetDate(goal: AutopilotGoal) {
  if (goal.remaining <= 0) return "Đã đạt";
  if (!goal.targetDate) return "Chưa đủ tốc độ";

  return goal.deadlineDelayDays
    ? `${formatDateShort(goal.targetDate)} · trễ ${goal.deadlineDelayDays} ngày`
    : formatDateShort(goal.targetDate);
}

function parseSignedMoneyInput(value: unknown) {
  if (typeof value !== "string") return 0;

  const isNegative = value.trim().startsWith("-");
  const numericValue = Number(value.replace(/[^\d]/g, ""));

  if (!Number.isFinite(numericValue)) return 0;

  return isNegative ? -numericValue : numericValue;
}

export function AutopilotPanel({
  actualMoney,
  balanceChecks,
  entries,
  expenses,
  goals,
  navigateToGoals,
  navigateToHub,
  today,
}: AutopilotPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { dashboard, moneyRadar } = useMemo(() => {
    const hubEntries = loadLocalJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, []);
    const hubSettings = {
      ...DEFAULT_HUB_SETTINGS,
      ...loadLocalJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {}),
    };
    const calculatorForm = loadLocalJson<{ negativeWallet?: string }>(
      STORAGE_HUB_CALCULATOR_KEY,
      {}
    );

    return {
      dashboard: buildAutopilotDashboard({
        actualMoney,
        entries,
        expenses,
        goals,
        hubEntries,
        hubSettings,
        today,
      }),
      moneyRadar: buildMoneyRadar({
        appMoney: actualMoney,
        balanceChecks,
        entries,
        expenses,
        negativeWallet: parseSignedMoneyInput(calculatorForm.negativeWallet),
        today,
      }),
    };
  }, [actualMoney, balanceChecks, entries, expenses, goals, today]);
  const { tomorrow } = dashboard;
  const visibleGoals = dashboard.goals.slice(0, 4);
  const priorityGoal = tomorrow.priorityGoal;
  const mostUrgentGoal =
    priorityGoal ??
    dashboard.goals.find((goal) => goal.status !== "reached") ??
    dashboard.goals[0];

  const detailContent = (
    <section className="grid gap-4">
      <section className="app-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Trợ lý điều hành
            </p>
            <h3 className="mt-1 text-xl font-black">Kế hoạch ngày mai</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tự tính từ mục tiêu, nhịp gần đây và hiệu suất Hub đã lưu.
            </p>
          </div>

          <button
            type="button"
            onClick={navigateToHub}
            className="app-primary-button rounded-xl px-4 py-2 text-sm font-bold"
          >
            Mở Hub
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OperatorMetric
            label="Ròng tối thiểu"
            value={formatMoney(tomorrow.targetNet)}
          />
          <OperatorMetric
            label="Thu nhập nên nhắm"
            value={formatMoney(tomorrow.incomeTarget)}
          />
          <OperatorMetric
            label="Trần chi tiêu"
            value={formatMoney(tomorrow.expenseCap)}
          />
          <OperatorMetric
            label="Thiếu so với nhịp 7 ngày"
            value={formatMoney(tomorrow.gapVsRecentPace)}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-700">Nên chạy</p>
            <h4 className="mt-2 text-lg font-black">
              {tomorrow.recommendedShift?.label ??
                tomorrow.recommendedHub?.label ??
                "Chưa đủ dữ liệu Hub"}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {tomorrow.estimatedOrders === null && tomorrow.estimatedHours === null
                ? "Hãy nhập thêm vài ca Hub để app học hiệu suất của bạn."
                : `Cần khoảng ${
                    tomorrow.estimatedOrders ?? "?"
                  } đơn hoặc ${tomorrow.estimatedHours ?? "?"} giờ để đạt mốc ngày mai.`}
            </p>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-700">
              Nếu bị thiếu tiền
            </p>
            <h4 className="mt-2 text-lg font-black">
              {tomorrow.gapVsRecentPace > 0
                ? formatMoney(tomorrow.gapVsRecentPace)
                : "Đang đủ nhịp"}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {tomorrow.gapVsRecentPace > 0
                ? `Bù thêm khoảng ${
                    tomorrow.extraOrdersForGap ?? "?"
                  } đơn hoặc ${tomorrow.extraHoursForGap ?? "?"} giờ.`
                : "Giữ nhịp hiện tại và kiểm soát chi tiêu là ổn."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {tomorrow.actions.map((action) => (
            <p
              key={action}
              className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
            >
              {action}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Autopilot mục tiêu
            </p>
            <h3 className="mt-1 text-xl font-black">
              Trạng thái sống của từng mục tiêu
            </h3>
          </div>

          <button
            type="button"
            onClick={navigateToGoals}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold hover:bg-slate-100"
          >
            Xem mục tiêu
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visibleGoals.map((goal) => (
            <GoalAutopilotCard key={`${goal.kind}-${goal.id}`} goal={goal} />
          ))}
        </div>
      </section>

      <MoneyRadarPanel radar={moneyRadar} />
    </section>
  );

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Điều hành & Autopilot
            </p>
            <h3 className="mt-1 text-xl font-black">Kế hoạch thông minh</h3>
            <p className="mt-1 text-sm text-slate-500">
              Home chỉ hiển thị tóm tắt, bấm xem để mở phân tích đầy đủ.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
          >
            Xem kế hoạch
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <OperatorMetric
            label="Ngày mai cần ròng"
            value={formatMoney(tomorrow.targetNet)}
          />
          <OperatorMetric
            label="Ưu tiên"
            value={mostUrgentGoal?.name ?? "Chưa có mục tiêu"}
          />
          <OperatorMetric label="Radar tiền" value={moneyRadar.statusText} />
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-2xl bg-[var(--background)] shadow-2xl">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-white px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Điều hành & Autopilot
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Kế hoạch và radar tiền
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="app-secondary-button rounded-xl px-4 py-2 text-sm font-bold"
              >
                Đóng
              </button>
            </header>

            <div className="overflow-y-auto p-4 sm:p-5">{detailContent}</div>
          </div>
        </div>
      )}
    </>
  );
}

function OperatorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-emerald-50 p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xl font-black">{value}</p>
    </div>
  );
}

function getRadarStatusClass(status: MoneyRadarSeverity) {
  if (status === "danger") return "bg-red-50 text-red-700";
  if (status === "warning") return "bg-amber-50 text-amber-700";
  if (status === "info") return "bg-blue-50 text-blue-700";

  return "bg-green-50 text-green-700";
}

function MoneyRadarPanel({ radar }: { radar: MoneyRadar }) {
  const [auditIndex, setAuditIndex] = useState(0);
  const safeAuditIndex = Math.min(
    auditIndex,
    Math.max(radar.dailyAudits.length - 1, 0)
  );
  const selectedAudit = radar.dailyAudits[safeAuditIndex];
  const canGoOlder = safeAuditIndex < radar.dailyAudits.length - 1;
  const canGoNewer = safeAuditIndex > 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Radar lệch tiền
          </p>
          <h3 className="mt-1 text-xl font-black">Phát hiện mất tiền / lệch tiền</h3>
          <p className="mt-1 text-sm text-slate-500">
            So tiền app tính, ví thật, tài khoản, ví app âm, thu nhập và chi tiêu đã ghi.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getRadarStatusClass(
            radar.status
          )}`}
        >
          {radar.statusText}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OperatorMetric label="Tiền app tính" value={formatMoney(radar.appMoney)} />
        <OperatorMetric
          label="Tiền ví thật + tài khoản"
          value={radar.actualMoney === null ? "Chưa kiểm kê" : formatMoney(radar.actualMoney)}
        />
        <OperatorMetric
          label="Ví app âm"
          value={formatMoney(radar.negativeWalletDebt)}
        />
        <OperatorMetric
          label="Lệch hôm nay"
          value={
            radar.todayDifference === null
              ? "Chưa kiểm kê"
              : formatMoney(radar.todayDifference)
          }
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric
          label="Tiền mặt"
          value={radar.cash === null ? "Chưa có" : formatMoney(radar.cash)}
        />
        <MiniMetric
          label="Tài khoản"
          value={radar.bank === null ? "Chưa có" : formatMoney(radar.bank)}
        />
        <MiniMetric label="Thu nhập hôm nay" value={formatMoney(radar.todayIncome)} />
        <MiniMetric label="Chi tiêu hôm nay" value={formatMoney(radar.todayExpense)} />
      </div>

      <div className="mt-4 grid gap-2">
        {radar.alerts.map((alert) => (
          <article
            key={alert.id}
            className={`rounded-2xl p-3 ${getRadarStatusClass(alert.severity)}`}
          >
            <p className="font-bold">{alert.title}</p>
            <p className="mt-1 text-sm opacity-90">{alert.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-black">Dữ liệu lệch tiền ngày cũ</h4>
            <p className="mt-1 text-sm text-slate-500">
              Dùng nút chuyển ngày để xem lại từng lần kiểm kê.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setAuditIndex(safeAuditIndex + 1)}
              disabled={!canGoOlder}
              title="Xem ngày cũ hơn"
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg font-black ${
                canGoOlder
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "cursor-not-allowed bg-slate-100 text-slate-300"
              }`}
            >
              &lt;
            </button>

            <span className="min-w-12 text-center text-xs font-bold text-slate-500">
              {radar.dailyAudits.length === 0
                ? "0/0"
                : `${safeAuditIndex + 1}/${radar.dailyAudits.length}`}
            </span>

            <button
              type="button"
              onClick={() => setAuditIndex(Math.max(safeAuditIndex - 1, 0))}
              disabled={!canGoNewer}
              title="Xem ngày mới hơn"
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg font-black ${
                canGoNewer
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "cursor-not-allowed bg-slate-100 text-slate-300"
              }`}
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="mt-4">
          {selectedAudit ? (
            <MoneyRadarAuditCard audit={selectedAudit} />
          ) : (
            <p className="rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-500">
              Chưa có dữ liệu kiểm kê cũ.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MoneyRadarAuditCard({ audit }: { audit: MoneyRadarDailyAudit }) {
  return (
    <article className="rounded-2xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {formatDateShort(audit.date)}
          </p>
          <h5 className="mt-1 font-black">{audit.statusText}</h5>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getRadarStatusClass(
            audit.status
          )}`}
        >
          {formatMoney(audit.difference)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric label="App tính" value={formatMoney(audit.appMoney)} />
        <MiniMetric label="Tiền thật" value={formatMoney(audit.actualMoney)} />
        <MiniMetric label="Thu nhập ngày đó" value={formatMoney(audit.income)} />
        <MiniMetric label="Chi tiêu ngày đó" value={formatMoney(audit.expense)} />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="Tiền mặt" value={formatMoney(audit.cash)} />
        <MiniMetric label="Tài khoản" value={formatMoney(audit.bank)} />
        <MiniMetric
          label="Khoản khác"
          value={audit.hasOtherExpense ? "Có phát sinh" : "Không có"}
        />
      </div>
    </article>
  );
}

function GoalAutopilotCard({ goal }: { goal: AutopilotGoal }) {
  return (
    <article className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {goal.kind === "main" ? "Mục tiêu chính" : "Mục tiêu phụ"}
          </p>
          <h4 className="mt-1 break-words font-black">{goal.name}</h4>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
            goal.status
          )}`}
        >
          {goal.statusLabel}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Tiến độ tiền</span>
          <strong>{goal.progress}%</strong>
        </div>
        <ProgressBar value={goal.progress} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MiniMetric label="Còn thiếu" value={formatMoney(goal.remaining)} />
        <MiniMetric label="Còn ngày" value={`${goal.daysLeft} ngày`} />
        <MiniMetric label="Cần / ngày" value={formatMoney(goal.requiredPerDay)} />
        <MiniMetric label="Cần / tuần" value={formatMoney(goal.weeklyTarget)} />
        <MiniMetric label="Tốc độ hiện tại" value={formatMoney(goal.currentPace)} />
        <MiniMetric label="Dự kiến đạt" value={formatTargetDate(goal)} />
      </div>

      <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
        {goal.todayMessage}
      </p>

      {goal.nextMilestone && (
        <p className="mt-2 text-sm text-slate-500">
          Mốc kế tiếp {goal.nextMilestone}%: còn{" "}
          <strong>{formatMoney(goal.missingToNextMilestone)}</strong>.
        </p>
      )}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold">{value}</p>
    </div>
  );
}
