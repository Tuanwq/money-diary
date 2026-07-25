import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
} from "../../types";
import type { HubEntry, HubType } from "../../types/hub";

export const AUTOMATION_STORAGE_KEY = "money_diary_automation_state";

export type AutomationTrigger =
  | "journal_income"
  | "expense"
  | "hub_shift"
  | "balance_difference";

export type AutomationAction = "ledger" | "subgoal" | "alert";

export type AutomationAmountMode = "full" | "percent" | "fixed";

export type AutomationRule = {
  action: AutomationAction;
  activeFrom: string;
  amountMode: AutomationAmountMode;
  amountValue: number;
  createdAt: string;
  enabled: boolean;
  expenseLabel: string;
  hubType: HubType | "";
  id: string;
  minimumAmount: number;
  name: string;
  targetId: string;
  trigger: AutomationTrigger;
  updatedAt: string;
};

export type AutomationEvent = {
  amount: number;
  date: string;
  direction: "expense" | "income";
  expenseLabel: string;
  hubType: HubType | "";
  id: string;
  occurredAt: string;
  title: string;
  trigger: AutomationTrigger;
};

export type AutomationExecution = {
  action: AutomationAction;
  amount: number;
  date: string;
  direction: "expense" | "income";
  eventId: string;
  idempotencyKey: string;
  ruleId: string;
  ruleName: string;
  targetId: string;
  title: string;
};

export type AutomationRunLog = {
  action: AutomationAction;
  amount: number;
  createdAt: string;
  date: string;
  id: string;
  message: string;
  ruleId: string;
  ruleName: string;
  status: "success";
};

export type AutomationState = {
  logs: AutomationRunLog[];
  processedKeys: string[];
  rules: AutomationRule[];
  updatedAt: string;
};

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  journal_income: "Khi có thu nhập trong nhật ký",
  expense: "Khi có khoản chi",
  hub_shift: "Khi có ca Hub",
  balance_difference: "Khi kiểm kê có chênh lệch",
};

export const AUTOMATION_ACTION_LABELS: Record<AutomationAction, string> = {
  ledger: "Ghi vào sổ tài khoản",
  subgoal: "Góp vào mục tiêu phụ",
  alert: "Ghi cảnh báo",
};

export const AUTOMATION_AMOUNT_MODE_LABELS: Record<
  AutomationAmountMode,
  string
> = {
  full: "Toàn bộ số tiền",
  percent: "Theo phần trăm",
  fixed: "Số tiền cố định",
};

export function createDefaultAutomationState(): AutomationState {
  return {
    logs: [],
    processedKeys: [],
    rules: [],
    updatedAt: new Date().toISOString(),
  };
}

export function isAutomationState(value: unknown): value is AutomationState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AutomationState>;

  return (
    Array.isArray(candidate.logs) &&
    Array.isArray(candidate.processedKeys) &&
    Array.isArray(candidate.rules) &&
    typeof candidate.updatedAt === "string"
  );
}

function getEventTimestamp(value: { createdAt: string; updatedAt?: string }) {
  return value.updatedAt ?? value.createdAt;
}

function getExpenseLabels(expense: ExpenseEntry) {
  const labels = (expense.otherItems ?? [])
    .filter((item) => item.amount > 0)
    .map((item) => item.label.trim())
    .filter(Boolean);

  if (expense.breakfast > 0) labels.push("Ăn sáng");
  if (expense.lunch > 0) labels.push("Ăn trưa");
  if (expense.dinner > 0) labels.push("Ăn tối");
  if (expense.other > 0 && labels.length === 0) {
    labels.push(expense.otherLabel?.trim() || "Khác");
  }

  return labels;
}

export function buildAutomationEvents({
  balanceChecks,
  entries,
  expenses,
  hubEntries,
}: {
  balanceChecks: BalanceCheckEntry[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  hubEntries: HubEntry[];
}): AutomationEvent[] {
  const journalEvents = entries
    .map((entry): AutomationEvent | null => {
      const amount =
        (entry.income ?? 0) +
        (entry.bonusMoney ?? 0) +
        (entry.receivedMoney ?? 0);

      if (amount <= 0) return null;

      return {
        amount,
        date: entry.date,
        direction: "income",
        expenseLabel: "",
        hubType: "",
        id: `journal:${entry.id}`,
        occurredAt: getEventTimestamp(entry),
        title: `Thu nhập ngày ${entry.date}`,
        trigger: "journal_income",
      };
    })
    .filter((event): event is AutomationEvent => Boolean(event));
  const expenseEvents = expenses
    .map((expense): AutomationEvent | null => {
      const amount =
        expense.breakfast +
        expense.lunch +
        expense.dinner +
        expense.other;

      if (amount <= 0) return null;

      return {
        amount,
        date: expense.date,
        direction: "expense",
        expenseLabel: getExpenseLabels(expense).join("|"),
        hubType: "",
        id: `expense:${expense.id}`,
        occurredAt: getEventTimestamp(expense),
        title: `Chi tiêu ngày ${expense.date}`,
        trigger: "expense",
      };
    })
    .filter((event): event is AutomationEvent => Boolean(event));
  const hubEvents = hubEntries
    .map((entry): AutomationEvent | null => {
      const amount = entry.diaryIncomeAmount ?? 0;

      if (amount <= 0) return null;

      return {
        amount,
        date: entry.date,
        direction: "income",
        expenseLabel: "",
        hubType: entry.hubType,
        id: `hub:${entry.id}`,
        occurredAt: getEventTimestamp(entry),
        title: `${entry.hubType.replace("_", " ")} · ${entry.shiftName}`,
        trigger: "hub_shift",
      };
    })
    .filter((event): event is AutomationEvent => Boolean(event));
  const balanceEvents = balanceChecks
    .map((entry): AutomationEvent | null => {
      if (entry.difference === 0) return null;

      return {
        amount: Math.abs(entry.difference),
        date: entry.date,
        direction: entry.difference > 0 ? "income" : "expense",
        expenseLabel: "",
        hubType: "",
        id: `balance:${entry.id}`,
        occurredAt: getEventTimestamp(entry),
        title: `Chênh lệch kiểm kê ngày ${entry.date}`,
        trigger: "balance_difference",
      };
    })
    .filter((event): event is AutomationEvent => Boolean(event));

  return [
    ...journalEvents,
    ...expenseEvents,
    ...hubEvents,
    ...balanceEvents,
  ];
}

function calculateExecutionAmount(
  rule: AutomationRule,
  eventAmount: number
) {
  if (rule.amountMode === "fixed") return rule.amountValue;
  if (rule.amountMode === "percent") {
    return Math.round((eventAmount * rule.amountValue) / 100);
  }

  return eventAmount;
}

function matchesRule(rule: AutomationRule, event: AutomationEvent) {
  if (
    !rule.enabled ||
    rule.trigger !== event.trigger ||
    event.amount < rule.minimumAmount ||
    new Date(event.occurredAt).getTime() <
      new Date(rule.activeFrom).getTime()
  ) {
    return false;
  }

  if (
    rule.trigger === "expense" &&
    rule.expenseLabel &&
    !event.expenseLabel
      .split("|")
      .some(
        (label) =>
          label.toLocaleLowerCase("vi-VN") ===
          rule.expenseLabel.toLocaleLowerCase("vi-VN")
      )
  ) {
    return false;
  }

  return !(
    rule.trigger === "hub_shift" &&
    rule.hubType &&
    event.hubType !== rule.hubType
  );
}

export function planAutomationExecutions({
  events,
  processedKeys,
  rules,
}: {
  events: AutomationEvent[];
  processedKeys: string[];
  rules: AutomationRule[];
}): AutomationExecution[] {
  const processed = new Set(processedKeys);
  const executions: AutomationExecution[] = [];

  rules.forEach((rule) => {
    events.forEach((event) => {
      const idempotencyKey = `${rule.id}:${event.id}`;

      if (processed.has(idempotencyKey) || !matchesRule(rule, event)) return;

      const amount = calculateExecutionAmount(rule, event.amount);

      if (amount <= 0) return;

      executions.push({
        action: rule.action,
        amount,
        date: event.date,
        direction: event.direction,
        eventId: event.id,
        idempotencyKey,
        ruleId: rule.id,
        ruleName: rule.name,
        targetId: rule.targetId,
        title: event.title,
      });
    });
  });

  return executions;
}

export function executionToLog(
  execution: AutomationExecution,
  createdAt = new Date().toISOString()
): AutomationRunLog {
  const actionText =
    execution.action === "ledger"
      ? "Đã ghi giao dịch vào sổ tài khoản"
      : execution.action === "subgoal"
        ? "Đã góp tiền vào mục tiêu phụ"
        : "Đã ghi nhận cảnh báo";

  return {
    action: execution.action,
    amount: execution.amount,
    createdAt,
    date: execution.date,
    id: crypto.randomUUID(),
    message: `${actionText}: ${execution.title}.`,
    ruleId: execution.ruleId,
    ruleName: execution.ruleName,
    status: "success",
  };
}
