import { useBrowserRoute } from "./app/router/useBrowserRoute";
import { DayMarkApp } from "./features/daymark/DayMarkApp";
import { HubSelectionPage } from "./features/hub/pages/HubSelectionPage";
import {
  BalanceCheckOverlay,
  type BalanceCheckOverlayMode,
} from "./features/money-diary/components/balance-check/BalanceCheckOverlay";
import { MoneyPageShell } from "./features/money-diary/components/layout/MoneyPageShell";
import { exportWordReport } from "./features/report/exportWordReport";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useCloudSync } from "./hooks/useCloudSync";
import { useMoneyDiaryData } from "./hooks/useMoneyDiaryData";
import { useThemeMode } from "./hooks/useThemeMode";
import { AppChangeLogPage } from "./pages/AppChangeLogPage";
import { AuthPage } from "./pages/AuthPage";
import { BalanceChecksPage } from "./pages/BalanceChecksPage";
import { CloseDayPage, type CloseDayForm } from "./pages/CloseDayPage";
import { EntryPage } from "./pages/EntryPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { GoalsPage } from "./pages/GoalsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS_PER_PAGE, STORAGE_APP_CHANGE_LOGS_KEY } from "./constants";
import {
  DEFAULT_HUB_SETTINGS,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "./constants/hanoiHub";
import {
  HubPage,
  type HubDiaryContribution,
  type HubDiaryPayload,
} from "./pages/HubPage";
import type { HubEntry, HubSettings } from "./types/hub";
import type {
  BalanceCheckEntry,
  BalanceSnapshot,
  AppChangeLog,
  AppChangePatch,
  AppDataKey,
  CompletedGoal,
  DailyEntry,
  ExpenseBudget,
  ExpenseEntry,
  GoalContribution,
  Goals,
  Mood,
  OtherExpenseItem,
  SubGoal,
} from "./types";
import {
  getDateDaysAgo,
  getDateString,
  getDaysLeft,
  getMonthStart,
  getToday,
  isDateInRange,
  isSameMonth,
  isThisWeek,
  toDate,
} from "./utils/date";
import { getBalanceStatus } from "./utils/balance";
import {
  getBonusMoney,
  getExpenseTotal,
  getMainIncome,
  getNormalIncome,
  getOtherExpenseItems,
  getReceivedMoney,
  getTotalEntryMoney,
} from "./utils/entries";
import {
  buildSubGoalProgressData,
  getGoalTimeProgress,
  getProgress,
  getSubGoalSaved,
} from "./utils/goals";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "./utils/money";
import {
  buildDataWarnings,
  type DataWarning,
} from "./utils/dataWarnings";
import { buildGoalForecast } from "./utils/forecast";
import { calculateHubIncome } from "./utils/hubIncome";
import {
  createOtherExpenseItemForm,
  type OtherExpenseItemForm,
} from "./utils/otherExpenseForms";

function buildOtherExpenseFormItems(expense?: ExpenseEntry): OtherExpenseItemForm[] {
  const items = expense ? getOtherExpenseItems(expense) : [];

  if (items.length === 0) return [createOtherExpenseItemForm()];

  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    amount: formatMoneyInput(String(item.amount)),
    label: item.label,
  }));
}

function normalizeOtherExpenseItems(
  items: OtherExpenseItemForm[]
): OtherExpenseItem[] {
  return items
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      label: item.label.trim(),
      amount: parseMoneyInput(item.amount),
    }))
    .filter((item) => item.amount > 0);
}

function getSingleOtherExpenseLabel(items: OtherExpenseItem[]) {
  return items.length === 1 ? items[0].label : "";
}

function createCloseDayForm(date = getToday()): CloseDayForm {
  return {
    date,
    income: "",
    bonusMoney: "",
    receivedMoney: "",
    expenseMode: "total",
    expenseTotal: "",
    breakfast: "",
    lunch: "",
    dinner: "",
    otherItems: [createOtherExpenseItemForm()],
    note: "",
    mood: "normal",
  };
}

function roundWorkHours(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 10) / 10;
}

function loadLocalJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);

  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

type AppDataSnapshot = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  goals: Goals;
  completedGoals: CompletedGoal[];
};

const APP_DATA_LABELS: Record<AppDataKey, string> = {
  entries: "Nhật ký",
  expenses: "Chi tiêu",
  balanceChecks: "Kiểm kê",
  goals: "Mục tiêu",
  completedGoals: "Mục tiêu đã hoàn thành",
};

function cloneForChangeLog<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createAppChangePatch<T>({
  key,
  before,
  after,
  beforeSummary,
  afterSummary,
}: {
  key: AppDataKey;
  before: T;
  after: T;
  beforeSummary: string;
  afterSummary: string;
}): AppChangePatch {
  return {
    key,
    before: cloneForChangeLog(before),
    after: cloneForChangeLog(after),
    beforeSummary,
    afterSummary,
  };
}

function describeDailyEntry(entry?: DailyEntry) {
  if (!entry) return "Chưa có nhật ký ngày này.";

  return [
    `Ngày ${entry.date}`,
    `Làm: ${formatMoney(entry.income)}`,
    `Thưởng: ${formatMoney(entry.bonusMoney ?? 0)}`,
    `Nhận: ${formatMoney(entry.receivedMoney ?? 0)}`,
    `Đơn: ${entry.orderCount ?? 0}`,
    `Giờ: ${roundWorkHours(entry.workHours ?? 0)}`,
  ].join("\n");
}

function describeExpenseEntry(expense?: ExpenseEntry) {
  if (!expense) return "Chưa có chi tiêu ngày này.";

  const otherItems = getOtherExpenseItems(expense);
  const otherText =
    otherItems.length > 0
      ? otherItems
          .map((item) => `${item.label || "Khác"}: ${formatMoney(item.amount)}`)
          .join(", ")
      : formatMoney(expense.other ?? 0);

  return [
    `Ngày ${expense.date}`,
    `Tổng chi: ${formatMoney(getExpenseTotal(expense))}`,
    `Sáng: ${formatMoney(expense.breakfast)}`,
    `Trưa: ${formatMoney(expense.lunch)}`,
    `Tối: ${formatMoney(expense.dinner)}`,
    `Khác: ${otherText}`,
  ].join("\n");
}

function describeBalanceCheck(check?: BalanceCheckEntry) {
  if (!check) return "Chưa có kiểm kê ngày này.";

  return [
    `Ngày ${check.date}`,
    `App tính: ${formatMoney(check.appMoney)}`,
    `Tiền thật: ${formatMoney(check.actualMoney)}`,
    `Lệch: ${formatMoney(check.difference)}`,
    `Tiền mặt: ${formatMoney(check.cash)}`,
    `Tài khoản: ${formatMoney(check.bank)}`,
  ].join("\n");
}

function describeSubGoal(goal?: SubGoal) {
  if (!goal) return "Không còn mục tiêu phụ này.";

  return [
    goal.name,
    `Mục tiêu: ${formatMoney(goal.target)}`,
    `Đã có: ${formatMoney(getSubGoalSaved(goal))}`,
    `Hạn: ${goal.deadline}`,
    `Số lần góp: ${goal.contributions.length}`,
  ].join("\n");
}

function describeMainGoal(goals: Goals) {
  return [
    goals.bigGoalName,
    `Mục tiêu lớn: ${formatMoney(goals.bigGoalTarget)}`,
    `Tiền ban đầu/đã có: ${formatMoney(goals.bigGoalSaved)}`,
    `Hạn: ${goals.bigGoalDeadline}`,
    `Mục tiêu phụ: ${goals.subGoals?.length ?? 0}`,
  ].join("\n");
}

function describeCompletedGoal(goal?: CompletedGoal) {
  if (!goal) return "Không có mục tiêu hoàn thành này.";

  return [
    goal.name,
    `Mục tiêu: ${formatMoney(goal.target)}`,
    `Đã có khi hoàn thành: ${formatMoney(goal.saved)}`,
    `Hoàn thành ngày: ${goal.completedAt}`,
  ].join("\n");
}

function describeCollectionSnapshot(key: AppDataKey, value: unknown) {
  if (key === "entries" && Array.isArray(value)) {
    return `${value.length} bản ghi nhật ký.`;
  }

  if (key === "expenses" && Array.isArray(value)) {
    return `${value.length} bản ghi chi tiêu.`;
  }

  if (key === "balanceChecks" && Array.isArray(value)) {
    return `${value.length} bản ghi kiểm kê.`;
  }

  if (key === "completedGoals" && Array.isArray(value)) {
    return `${value.length} mục tiêu đã hoàn thành.`;
  }

  if (key === "goals") {
    return describeMainGoal(value as Goals);
  }

  return `Dữ liệu ${APP_DATA_LABELS[key]} đã thay đổi.`;
}

function buildHubDiaryMigrationTotals() {
  const hubEntries = loadLocalJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, []);

  if (!Array.isArray(hubEntries) || hubEntries.length === 0) {
    return new Map<
      string,
      { grossIncome: number; legacyGrossIncome: number; workIncome: number }
    >();
  }

  const settings: HubSettings = {
    ...DEFAULT_HUB_SETTINGS,
    ...loadLocalJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {}),
  };
  const totalsByDate = new Map<
    string,
    { grossIncome: number; legacyGrossIncome: number; workIncome: number }
  >();

  for (const entry of hubEntries) {
    const income = calculateHubIncome(entry, settings);
    const current = totalsByDate.get(entry.date) ?? {
      grossIncome: 0,
      legacyGrossIncome: 0,
      workIncome: 0,
    };
    const legacyExtraJoinReward =
      entry.hubType === "HUB_3" &&
      entry.isWellDone &&
      settings.includeExtraOrderReward
        ? getLegacyHub3JoinReward(income.totalJoinChildOrders)
        : income.extraJoinOrderReward;
    const legacyGrossIncome =
      income.workIncome +
      legacyExtraJoinReward +
      income.sundayReward +
      income.weekdayRegionReward;

    totalsByDate.set(entry.date, {
      grossIncome: current.grossIncome + income.total,
      legacyGrossIncome: current.legacyGrossIncome + legacyGrossIncome,
      workIncome: current.workIncome + income.workIncome,
    });
  }

  return totalsByDate;
}

function getLegacyHub3JoinReward(totalJoinChildOrders: number) {
  if (totalJoinChildOrders < 5) return 0;

  const firstTierOrders = Math.max(
    Math.min(totalJoinChildOrders, 8) - 5 + 1,
    0
  );
  const secondTierOrders = Math.max(totalJoinChildOrders - 8, 0);

  return firstTierOrders * 1000 + secondTierOrders * 3000;
}

function applyHubDiaryContribution(
  entries: DailyEntry[],
  contribution: HubDiaryContribution,
  direction: 1 | -1,
  now: string
) {
  const existing = entries.find((entry) => entry.date === contribution.date);

  if (!existing && direction === -1) return entries;

  if (!existing) {
    const newEntry: DailyEntry = {
      id: crypto.randomUUID(),
      date: contribution.date,
      diary: "",
      income: contribution.income,
      receivedMoney: 0,
      bonusMoney: 0,
      orderCount: contribution.orderCount,
      workHours: roundWorkHours(contribution.workHours),
      mood: "normal",
      note: "",
      createdAt: now,
      updatedAt: now,
    };

    return [...entries, newEntry];
  }

  const updatedEntry: DailyEntry = {
    ...existing,
    income: Math.max(0, existing.income + contribution.income * direction),
    orderCount: Math.max(
      0,
      (existing.orderCount ?? 0) + contribution.orderCount * direction
    ),
    workHours: roundWorkHours(
      Math.max(0, (existing.workHours ?? 0) + contribution.workHours * direction)
    ),
    updatedAt: now,
  };

  return entries.map((entry) =>
    entry.date === contribution.date ? updatedEntry : entry
  );
}

function applyHubDiaryContributionChange(
  entries: DailyEntry[],
  previousContribution: HubDiaryContribution | null,
  nextContribution: HubDiaryContribution | null,
  now: string
) {
  let nextEntries = entries;

  if (previousContribution) {
    nextEntries = applyHubDiaryContribution(
      nextEntries,
      previousContribution,
      -1,
      now
    );
  }

  if (nextContribution) {
    nextEntries = applyHubDiaryContribution(
      nextEntries,
      nextContribution,
      1,
      now
    );
  }

  return nextEntries;
}

export default function App() {
  const { themeMode, toggleThemeMode } = useThemeMode();
  const {
    entries,
    setEntries,
    goals,
    setGoals,
    completedGoals,
    setCompletedGoals,
    expenses,
    setExpenses,
    balanceChecks,
    setBalanceChecks,
  } = useMoneyDiaryData();
  const [appChangeLogs, setAppChangeLogs] = useState<AppChangeLog[]>(() =>
    loadLocalJson<AppChangeLog[]>(STORAGE_APP_CHANGE_LOGS_KEY, [])
  );
  const [balanceCheckForm, setBalanceCheckForm] = useState({
    date: getToday(),
    cash: "",
    bank: "",
    note: "",
  });
  const [balanceCheckOverlay, setBalanceCheckOverlay] = useState<{
    isOpen: boolean;
    mode: BalanceCheckOverlayMode;
  }>({ isOpen: false, mode: "edit" });
  const [isBalanceCheckSubmitting, setIsBalanceCheckSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingExpenseDate, setEditingExpenseDate] = useState<string | null>(
  null
);
  const { route, navigateApp } = useBrowserRoute();
  const { page, goalId, goalScreen, navigateTo, resetMoneyNavigation } =
    useAppNavigation();
  const [chartDays, setChartDays] = useState(7);
  const [forecastDays, setForecastDays] = useState(14);
  const [balanceChartDays, setBalanceChartDays] = useState<"all" | number>(
  "all"
);
  const {
    session,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    cloudLoadError,
    isCloudLoading,
    isCloudRefreshing,
    retryCloudLoad,
    syncStatus,
    setSyncStatus,
    markLocalChanged,
    handleSignUp,
    handleLogin,
    handleLogout,
    supabaseEnvError,
  } = useCloudSync({
    entries,
    setEntries,
    expenses,
    setExpenses,
    balanceChecks,
    setBalanceChecks,
    goals,
    setGoals,
    completedGoals,
    setCompletedGoals,
  });
  const hubDiaryMigrationDoneRef = useRef(false);
  const balanceCheckDraftDirtyRef = useRef(false);

  useEffect(() => {
    if (!session) {
      if (route.kind !== "login") {
        navigateApp("/login", true);
      }

      return;
    }

    if (route.kind === "login" || route.kind === "unknown") {
      navigateApp("/hub", true);
    }
  }, [navigateApp, route.kind, session]);

  function openMoneyDiaryApp() {
    resetMoneyNavigation();
    navigateApp("/money");
  }

  function openDayMarkApp() {
    navigateApp("/daymark/today");
  }

  function openAppHub() {
    navigateApp("/hub");
  }

  const [historySearch, setHistorySearch] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");

  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFromDate, setExpenseFromDate] = useState("");
  const [expenseToDate, setExpenseToDate] = useState("");
  const [expenseLabelFilter, setExpenseLabelFilter] = useState("");

  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [expenseCurrentPage, setExpenseCurrentPage] = useState(1);

  const [selectedCompletedGoalId, setSelectedCompletedGoalId] = useState<
  string | null
>(null);

  const [subGoalForm, setSubGoalForm] = useState({
  name: "",
  target: "",
  saved: "",
  deadline: getToday(),
  startDate: getToday(),
});
const [editingSubGoalId, setEditingSubGoalId] = useState<string | null>(null);

const [mainGoalForm, setMainGoalForm] = useState({
  bigGoalName: goals.bigGoalName,
  bigGoalTarget: formatMoneyInput(String(goals.bigGoalTarget ?? 0)),
  bigGoalSaved: formatMoneyInput(String(goals.bigGoalSaved ?? 0)),
  bigGoalStartDate: goals.bigGoalStartDate ?? getToday(),
  bigGoalDeadline: goals.bigGoalDeadline ?? getToday(),
});

const [subGoalContributionForms, setSubGoalContributionForms] = useState<
  Record<string, { amount: string; note: string }>
>({});
const [expenseBudgetForm, setExpenseBudgetForm] = useState({
  label: "Ăn uống",
  monthlyLimit: "",
});
const [editingExpenseBudgetId, setEditingExpenseBudgetId] = useState<
  string | null
>(null);
const [subGoalAllocationDateHint, setSubGoalAllocationDateHint] =
  useState(getToday());

useEffect(() => {
  if (hubDiaryMigrationDoneRef.current) return;

  const hubTotalsByDate = buildHubDiaryMigrationTotals();
  const shouldMigrate = entries.some((entry) => {
    const totals = hubTotalsByDate.get(entry.date);

    return Boolean(
      totals &&
        totals.grossIncome !== totals.workIncome &&
        (entry.income === totals.grossIncome ||
          entry.income === totals.legacyGrossIncome)
    );
  });

  if (!shouldMigrate) return;

  const now = new Date().toISOString();
  hubDiaryMigrationDoneRef.current = true;

  queueMicrotask(() => {
    setEntries((prev) =>
      prev.map((entry) => {
        const totals = hubTotalsByDate.get(entry.date);

        if (
          !totals ||
          totals.grossIncome === totals.workIncome ||
          (entry.income !== totals.grossIncome &&
            entry.income !== totals.legacyGrossIncome)
        ) {
          return entry;
        }

        return {
          ...entry,
          income: totals.workIncome,
          updatedAt: now,
        };
      })
    );
    markLocalChanged("Đã sửa tiền hub cũ trong nhật ký, đang lưu cloud...");
  });
}, [entries, markLocalChanged, setEntries]);

useEffect(() => {
  // Keep the editable goal form in sync when goals are loaded from storage/cloud.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMainGoalForm({
    bigGoalName: goals.bigGoalName,
    bigGoalTarget: formatMoneyInput(String(goals.bigGoalTarget ?? 0)),
    bigGoalSaved: formatMoneyInput(String(goals.bigGoalSaved ?? 0)),
    bigGoalStartDate: goals.bigGoalStartDate ?? getToday(),
    bigGoalDeadline: goals.bigGoalDeadline ?? getToday(),
  });
}, [
  goals.bigGoalName,
  goals.bigGoalTarget,
  goals.bigGoalSaved,
  goals.bigGoalStartDate,
  goals.bigGoalDeadline,
]);

useEffect(() => {
  if (balanceCheckDraftDirtyRef.current && balanceCheckForm.date === selectedDate) {
    return;
  }

  const existing = balanceChecks.find((item) => item.date === selectedDate);

  setBalanceCheckForm({
    date: selectedDate,
    cash: existing ? formatMoneyInput(String(existing.cash)) : "",
    bank: existing ? formatMoneyInput(String(existing.bank)) : "",
    note: existing?.note ?? "",
  });

  balanceCheckDraftDirtyRef.current = false;
}, [selectedDate, balanceChecks, balanceCheckForm.date]);

useEffect(() => {
  localStorage.setItem(
    STORAGE_APP_CHANGE_LOGS_KEY,
    JSON.stringify(appChangeLogs.slice(0, 300))
  );
}, [appChangeLogs]);

function getCurrentAppSnapshot(): AppDataSnapshot {
  return {
    entries,
    expenses,
    balanceChecks,
    goals,
    completedGoals,
  };
}

function createChangeLog(input: Omit<AppChangeLog, "id" | "createdAt">) {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

function recordAppChange(input: Omit<AppChangeLog, "id" | "createdAt">) {
  setAppChangeLogs((prev) => [createChangeLog(input), ...prev].slice(0, 300));
}

function restoreChangeLog(id: string) {
  const log = appChangeLogs.find((item) => item.id === id);

  if (!log || log.restoredAt) return;

  const confirmed = confirm(
    `Khôi phục thay đổi "${log.title}"?\n\nCác phần liên quan sẽ quay về trạng thái trước thay đổi này.`
  );

  if (!confirmed) return;

  const beforeRestore = getCurrentAppSnapshot();
  const restoredSnapshot: AppDataSnapshot = {
    ...beforeRestore,
  };

  for (const patch of log.patches) {
    if (patch.key === "entries") {
      restoredSnapshot.entries = patch.before as DailyEntry[];
    } else if (patch.key === "expenses") {
      restoredSnapshot.expenses = patch.before as ExpenseEntry[];
    } else if (patch.key === "balanceChecks") {
      restoredSnapshot.balanceChecks = patch.before as BalanceCheckEntry[];
    } else if (patch.key === "goals") {
      restoredSnapshot.goals = patch.before as Goals;
    } else if (patch.key === "completedGoals") {
      restoredSnapshot.completedGoals = patch.before as CompletedGoal[];
    }
  }

  setEntries(restoredSnapshot.entries);
  setExpenses(restoredSnapshot.expenses);
  setBalanceChecks(restoredSnapshot.balanceChecks);
  setGoals(restoredSnapshot.goals);
  setCompletedGoals(restoredSnapshot.completedGoals);

  const restorePatches = log.patches.map((patch) => {
    const key = patch.key;

    return createAppChangePatch({
      key,
      before: beforeRestore[key],
      after: restoredSnapshot[key],
      beforeSummary: describeCollectionSnapshot(key, beforeRestore[key]),
      afterSummary: patch.beforeSummary,
    });
  });
  const now = new Date().toISOString();

  setAppChangeLogs((prev) => [
    createChangeLog({
      action: "restore",
      title: `Khôi phục: ${log.title}`,
      description: `Đã đưa dữ liệu về trạng thái trước thay đổi lúc ${new Date(
        log.createdAt
      ).toLocaleString("vi-VN")}.`,
      date: log.date,
      originalChangeId: log.id,
      patches: restorePatches,
    }),
    ...prev.map((item) =>
      item.id === log.id ? { ...item, restoredAt: now } : item
    ),
  ]);

  markLocalChanged("Đã khôi phục dữ liệu từ lịch sử thay đổi, đang lưu cloud...");
  setSyncStatus("Đã khôi phục dữ liệu");
}

  const [form, setForm] = useState({
    date: getToday(),
    diary: "",
    income: "",
    receivedMoney: "",
    bonusMoney: "",
    orderCount: "",
    workHours: "",
    mood: "normal" as Mood,
    note: "",
  });

  const [expenseForm, setExpenseForm] = useState({
  date: getToday(),
  breakfast: "",
  lunch: "",
  dinner: "",
  otherItems: [createOtherExpenseItemForm()],
  note: "",
});
  const [closeDayForm, setCloseDayForm] = useState<CloseDayForm>(() =>
    createCloseDayForm()
  );

  const todayString = getToday();
  const isSelectedToday = selectedDate === todayString;
  const selectedDateObject = toDate(selectedDate);

  const selectedEntry = entries.find((entry) => entry.date === selectedDate);

  const selectedMainIncome = selectedEntry ? getMainIncome(selectedEntry) : 0;
  const selectedBonusMoney = selectedEntry ? getBonusMoney(selectedEntry) : 0;
  const selectedReceivedMoney = selectedEntry
    ? getReceivedMoney(selectedEntry)
    : 0;

  const selectedIncome = selectedMainIncome + selectedBonusMoney;
  const selectedHours = selectedEntry?.workHours ?? 0;
  const selectedExpense = expenses.find((expense) => expense.date === selectedDate);
  const selectedBalanceCheck = balanceChecks.find(
    (item) => item.date === selectedDate
  );

const selectedExpenseTotal = selectedExpense
  ? selectedExpense.breakfast +
    selectedExpense.lunch +
    selectedExpense.dinner +
    selectedExpense.other
  : 0;

const selectedActualIncome = selectedIncome - selectedExpenseTotal;
const todayEntry = entries.find((entry) => entry.date === todayString);
const todayExpense = expenses.find((expense) => expense.date === todayString);
const todayBalanceCheck = balanceChecks.find(
  (item) => item.date === todayString
);
const todayMainIncome = todayEntry ? getMainIncome(todayEntry) : 0;
const todayBonusMoney = todayEntry ? getBonusMoney(todayEntry) : 0;
const todayReceivedMoney = todayEntry ? getReceivedMoney(todayEntry) : 0;
const todayExpenseTotal = todayExpense ? getExpenseTotal(todayExpense) : 0;
const todayWorkActualIncome =
  todayMainIncome + todayBonusMoney - todayExpenseTotal;
const todayActualIncome =
  todayMainIncome + todayBonusMoney + todayReceivedMoney - todayExpenseTotal;

  const weekEntries = entries.filter((entry) =>
    isThisWeek(entry.date, selectedDateObject)
  );

  const monthEntries = entries.filter((entry) =>
    isSameMonth(entry.date, selectedDateObject)
  );

  const weekIncome = weekEntries.reduce(
  (sum, entry) => sum + getTotalEntryMoney(entry),
  0
);
  // const weekHours = weekEntries.reduce((sum, entry) => sum + entry.workHours, 0);

  const monthIncome = monthEntries.reduce(
  (sum, entry) => sum + getTotalEntryMoney(entry),
  0
);
  const monthHours = monthEntries.reduce(
    (sum, entry) => sum + entry.workHours,
    0
  );

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const filteredEntries = sortedEntries.filter((entry) => {
  const keyword = historySearch.trim().toLowerCase();

  const matchKeyword =
    !keyword ||
    entry.date.toLowerCase().includes(keyword) ||
    entry.diary.toLowerCase().includes(keyword) ||
    entry.note.toLowerCase().includes(keyword);

  const matchDate = isDateInRange(
    entry.date,
    historyFromDate,
    historyToDate
  );

  return matchKeyword && matchDate;
});

const historyTotalPages = Math.max(
  1,
  Math.ceil(filteredEntries.length / ITEMS_PER_PAGE)
);

const paginatedEntries = filteredEntries.slice(
  (historyCurrentPage - 1) * ITEMS_PER_PAGE,
  historyCurrentPage * ITEMS_PER_PAGE
);

const filteredEntriesTotalMoney = filteredEntries.reduce(
  (sum, entry) => sum + getTotalEntryMoney(entry),
  0
);

const filteredEntriesHours = filteredEntries.reduce(
  (sum, entry) => sum + entry.workHours,
  0
);

const filteredEntriesOrders = filteredEntries.reduce(
  (sum, entry) => sum + (entry.orderCount ?? 0),
  0
);

const sortedExpenses = [...expenses].sort((a, b) =>
  b.date.localeCompare(a.date)
);

const expenseLabelOptions = Array.from(
  new Set(
    sortedExpenses.flatMap((expense) =>
      getOtherExpenseItems(expense).map((item) => item.label)
    )
  )
).sort((a, b) => a.localeCompare(b, "vi"));

const sortedBalanceChecks = [...balanceChecks].sort((a, b) =>
  b.date.localeCompare(a.date)
);

const filteredExpenses = sortedExpenses.filter((expense) => {
  const keyword = expenseSearch.trim().toLowerCase();
  const selectedLabel = expenseLabelFilter.trim();

  const matchKeyword =
    !keyword ||
    expense.date.toLowerCase().includes(keyword) ||
    expense.note.toLowerCase().includes(keyword) ||
    (expense.otherLabel ?? "").toLowerCase().includes(keyword) ||
    getOtherExpenseItems(expense).some((item) =>
      item.label.toLowerCase().includes(keyword)
    );

  const matchDate = isDateInRange(
    expense.date,
    expenseFromDate,
    expenseToDate
  );

  const matchLabel =
    !selectedLabel ||
    getOtherExpenseItems(expense).some((item) => item.label === selectedLabel);

  return matchKeyword && matchDate && matchLabel;
});

const expenseTotalPages = Math.max(
  1,
  Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE)
);

const paginatedExpenses = filteredExpenses.slice(
  (expenseCurrentPage - 1) * ITEMS_PER_PAGE,
  expenseCurrentPage * ITEMS_PER_PAGE
);

const filteredExpensesTotal = filteredExpenses.reduce((sum, expense) => {
  return (
    sum +
    expense.breakfast +
    expense.lunch +
    expense.dinner +
    expense.other
  );
}, 0);

const safeChartDays = Math.min(Math.max(chartDays, 1), 365);

const chartData = Array.from({ length: safeChartDays }).map((_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (safeChartDays - 1 - index));

  const dateString = date.toISOString().slice(0, 10);
  const entry = entries.find((item) => item.date === dateString);

  return {
    date: dateString.slice(5),
    income: entry ? getNormalIncome(entry) : 0,
  };
});

function updateHistorySearch(value: string) {
  setHistorySearch(value);
  setHistoryCurrentPage(1);
}

function updateHistoryFromDate(value: string) {
  setHistoryFromDate(value);
  setHistoryCurrentPage(1);
}

function updateHistoryToDate(value: string) {
  setHistoryToDate(value);
  setHistoryCurrentPage(1);
}

function setHistoryQuickFilter(
  type: "today" | "7days" | "30days" | "month" | "lastMonth" | "all"
) {
  setHistoryCurrentPage(1);

  if (type === "today") {
    setHistoryFromDate(getToday());
    setHistoryToDate(getToday());
  }

  if (type === "7days") {
    setHistoryFromDate(getDateDaysAgo(6));
    setHistoryToDate(getToday());
  }

  if (type === "30days") {
    setHistoryFromDate(getDateDaysAgo(29));
    setHistoryToDate(getToday());
  }

  if (type === "month") {
    setHistoryFromDate(getMonthStart());
    setHistoryToDate(getToday());
  }

  if (type === "lastMonth") {
    const range = getLastMonthRange();
    setHistoryFromDate(range.fromDate);
    setHistoryToDate(range.toDate);
  }

  if (type === "all") {
    setHistoryFromDate("");
    setHistoryToDate("");
    setHistorySearch("");
  }
}

function updateExpenseSearch(value: string) {
  setExpenseSearch(value);
  setExpenseCurrentPage(1);
}

function updateExpenseFromDate(value: string) {
  setExpenseFromDate(value);
  setExpenseCurrentPage(1);
}

function updateExpenseToDate(value: string) {
  setExpenseToDate(value);
  setExpenseCurrentPage(1);
}

function updateExpenseLabelFilter(value: string) {
  setExpenseLabelFilter(value);
  setExpenseCurrentPage(1);
}

function getLastMonthRange() {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const toDate = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    fromDate: getDateString(fromDate),
    toDate: getDateString(toDate),
  };
}

function setExpenseQuickFilter(
  type: "today" | "7days" | "30days" | "month" | "lastMonth" | "all"
) {
  setExpenseCurrentPage(1);

  if (type === "today") {
    setExpenseFromDate(getToday());
    setExpenseToDate(getToday());
  }

  if (type === "7days") {
    setExpenseFromDate(getDateDaysAgo(6));
    setExpenseToDate(getToday());
  }

  if (type === "30days") {
    setExpenseFromDate(getDateDaysAgo(29));
    setExpenseToDate(getToday());
  }

  if (type === "month") {
    setExpenseFromDate(getMonthStart());
    setExpenseToDate(getToday());
  }

  if (type === "lastMonth") {
    const range = getLastMonthRange();

    setExpenseFromDate(range.fromDate);
    setExpenseToDate(range.toDate);
  }

  if (type === "all") {
    setExpenseFromDate("");
    setExpenseToDate("");
    setExpenseSearch("");
    setExpenseLabelFilter("");
  }
}

function buildBalanceMovementData(
  startDate: string,
  endDate: string,
  startingMoney: number
): BalanceSnapshot[] {
  const result: BalanceSnapshot[] = [];

  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  let runningIncome = 0;
  let runningExpense = 0;

  while (currentDate <= lastDate) {
    const dateString = currentDate.toISOString().slice(0, 10);

    const dayIncome = entries
      .filter((entry) => entry.date === dateString)
      .reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0);

    const dayExpense = expenses
      .filter((expense) => expense.date === dateString)
      .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);

    runningIncome += dayIncome;
    runningExpense += dayExpense;

    const totalMoney = startingMoney + runningIncome;
    const actualMoney = totalMoney - runningExpense;

    result.push({
      date: dateString,
      totalMoney,
      actualMoney,
      income: dayIncome,
      expense: dayExpense,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

function getAppMoneyAtDate(date: string) {
  const startDate = goals.bigGoalStartDate ?? getToday();

  if (date < startDate) {
    return goals.bigGoalSaved;
  }

  const data = buildBalanceMovementData(startDate, date, goals.bigGoalSaved);

  return data.at(-1)?.actualMoney ?? goals.bigGoalSaved;
}

const totalIncome = entries.reduce(
  (sum, entry) => sum + getTotalEntryMoney(entry),
  0
);

const totalExpense = expenses.reduce((sum, expense) => {
  return (
    sum +
    expense.breakfast +
    expense.lunch +
    expense.dinner +
    expense.other
  );
}, 0);

const currentGoalStartDate = goals.bigGoalStartDate ?? getToday();

const selectedCompletedGoal = completedGoals.find(
  (goal) =>
    goal.id ===
    (goalScreen === "completedDetail"
      ? (goalId ?? selectedCompletedGoalId)
      : selectedCompletedGoalId)
);

const currentBalanceMovementData = buildBalanceMovementData(
  currentGoalStartDate,
  getToday(),
  goals.bigGoalSaved
);

const visibleBalanceMovementData =
  balanceChartDays === "all"
    ? currentBalanceMovementData
    : currentBalanceMovementData.slice(
        -Math.min(balanceChartDays, currentBalanceMovementData.length)
      );

const balanceChartTitle =
  balanceChartDays === "all"
    ? `Từ ngày bắt đầu hành trình: ${currentGoalStartDate}`
    : `${balanceChartDays} ngày gần nhất`;

const actualMoney = goals.bigGoalSaved + totalIncome - totalExpense;

const totalJourneyMoney = totalIncome;

const totalSavedForBigGoal = actualMoney;

  const bigGoalProgress = getProgress(totalSavedForBigGoal, goals.bigGoalTarget);
  const remainingBigGoal = Math.max(goals.bigGoalTarget - totalSavedForBigGoal, 0);
  const daysLeft = getDaysLeft(goals.bigGoalDeadline);
  const bigGoalTimeProgress = getGoalTimeProgress(
  goals.bigGoalStartDate ?? getToday(),
  goals.bigGoalDeadline
);

const isBigGoalBehind = bigGoalProgress + 5 < bigGoalTimeProgress;
  const needPerDay =
    daysLeft > 0 ? Math.ceil(remainingBigGoal / daysLeft) : remainingBigGoal;

const todayDailyIncomeRemaining =
  goals.dailyIncome > 0
    ? Math.max(goals.dailyIncome - todayWorkActualIncome, 0)
    : 0;
const todayGoalPaceRemaining =
  goals.bigGoalTarget > 0 && remainingBigGoal > 0
    ? Math.max(needPerDay - todayActualIncome, 0)
    : 0;
const dataWarnings = useMemo(
  () =>
    buildDataWarnings({
      entries,
      expenses,
      balanceChecks,
      today: selectedDate,
    }),
  [entries, expenses, balanceChecks, selectedDate]
);

const safeForecastDays = Math.min(Math.max(forecastDays, 1), 365);

const goalForecast = buildGoalForecast({
  entries,
  expenses,
  today: todayString,
  currentGoalStartDate,
  target: goals.bigGoalTarget,
  remaining: remainingBigGoal,
  deadline: goals.bigGoalDeadline,
  days: safeForecastDays,
});
  const incomePerHour = monthHours > 0 ? Math.round(monthIncome / monthHours) : 0;

  function changeSelectedDate(dayAmount: number) {
  const currentDate = toDate(selectedDate);
  currentDate.setDate(currentDate.getDate() + dayAmount);

  const nextDate = getDateString(currentDate);

  if (nextDate > todayString) {
    return;
  }

    setSelectedDate(nextDate);
  }

  function goToPreviousDay() {
    changeSelectedDate(-1);
  }

  function goToNextDay() {
    changeSelectedDate(1);
  }

  function goToToday() {
    setSelectedDate(todayString);
  }

  function handleSelectDate(value: string) {
    if (!value) return;

    if (value > todayString) {
      setSelectedDate(todayString);
      return;
    }

    setSelectedDate(value);
  }

function goToTodayEntryForm() {
  setSelectedDate(todayString);
  setForm((prev) => ({
    ...prev,
    date: todayString,
  }));
  setExpenseForm((prev) => ({
    ...prev,
    date: todayString,
  }));
  navigateTo("entry");
}

function buildCloseDayForm(date: string): CloseDayForm {
  const entry = entries.find((item) => item.date === date);
  const expense = expenses.find((item) => item.date === date);
  const expenseTotal = expense ? getExpenseTotal(expense) : 0;
  const otherItems = expense ? getOtherExpenseItems(expense) : [];
  const hasExpenseBreakdown = Boolean(
    expense &&
      (expense.breakfast > 0 ||
        expense.lunch > 0 ||
        expense.dinner > 0 ||
        otherItems.length > 0)
  );
  const useTotalExpense =
    !expense || !hasExpenseBreakdown;

  return {
    date,
    income: entry ? formatMoneyInput(String(entry.income ?? 0)) : "",
    bonusMoney: entry ? formatMoneyInput(String(entry.bonusMoney ?? 0)) : "",
    receivedMoney: entry
      ? formatMoneyInput(String(entry.receivedMoney ?? 0))
      : "",
    expenseMode: useTotalExpense ? "total" : "meals",
    expenseTotal:
      useTotalExpense && expenseTotal > 0
        ? formatMoneyInput(String(expenseTotal))
        : "",
    breakfast: expense ? formatMoneyInput(String(expense.breakfast ?? 0)) : "",
    lunch: expense ? formatMoneyInput(String(expense.lunch ?? 0)) : "",
    dinner: expense ? formatMoneyInput(String(expense.dinner ?? 0)) : "",
    otherItems: !useTotalExpense ? buildOtherExpenseFormItems(expense) : [
      createOtherExpenseItemForm(),
    ],
    note: entry?.note || entry?.diary || expense?.note || "",
    mood: entry?.mood ?? "normal",
  };
}

function openCloseDay(date = todayString) {
  const safeDate = date > todayString ? todayString : date;

  setSelectedDate(safeDate);
  setCloseDayForm(buildCloseDayForm(safeDate));
  navigateTo("closeDay");
}

function handleCloseDayDateChange(date: string) {
  if (!date) return;

  const safeDate = date > todayString ? todayString : date;

  setSelectedDate(safeDate);
  setCloseDayForm(buildCloseDayForm(safeDate));
}

function handleDataWarningAction(warning: DataWarning) {
  const warningDate = warning.actionDate ?? todayString;

  if (warning.actionPage === "closeDay") {
    openCloseDay(warningDate);
    return;
  }

  if (warning.actionPage === "home") {
    openBalanceCheckOverlay(warningDate, "edit");
    return;
  }

  navigateTo(warning.actionPage, warning.actionGoalScreen ?? "menu");
}

function openBalanceCheckOverlay(
  date: string,
  mode: BalanceCheckOverlayMode = "edit"
) {
  const safeDate = date > todayString ? todayString : date;
  const existing = balanceChecks.find((item) => item.date === safeDate);

  balanceCheckDraftDirtyRef.current = false;
  setSelectedDate(safeDate);
  setBalanceCheckForm({
    date: safeDate,
    cash: existing ? formatMoneyInput(String(existing.cash ?? 0)) : "",
    bank: existing ? formatMoneyInput(String(existing.bank ?? 0)) : "",
    note: existing?.note ?? "",
  });
  setBalanceCheckOverlay({
    isOpen: true,
    mode: mode === "details" && !existing ? "edit" : mode,
  });
  navigateTo("home", "menu");
}

function closeBalanceCheckOverlay() {
  if (
    balanceCheckDraftDirtyRef.current &&
    !confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng kiểm kê không?")
  ) {
    return;
  }

  balanceCheckDraftDirtyRef.current = false;
  setBalanceCheckOverlay((current) => ({ ...current, isOpen: false }));
}

function goToTodayBalanceCheck() {
  openBalanceCheckOverlay(todayString, "edit");
}

function handleExpenseSubmit(event: React.FormEvent) {
  event.preventDefault();

  if (!expenseForm.date) {
    alert("Bạn chưa chọn ngày chi tiêu.");
    return;
  }

  const breakfast = parseMoneyInput(expenseForm.breakfast);
  const lunch = parseMoneyInput(expenseForm.lunch);
  const dinner = parseMoneyInput(expenseForm.dinner);
  const otherItems = normalizeOtherExpenseItems(expenseForm.otherItems);
  const other = otherItems.reduce((sum, item) => sum + item.amount, 0);

  if (breakfast < 0 || lunch < 0 || dinner < 0 || other < 0) {
    alert("Chi tiêu không được âm.");
    return;
  }

  const now = new Date().toISOString();
  const savedDate = expenseForm.date;
  const existingExpense = expenses.find(
    (expense) => expense.date === expenseForm.date
  );
  const newExpense: ExpenseEntry = {
    id: existingExpense?.id ?? crypto.randomUUID(),
    date: expenseForm.date,
    breakfast,
    lunch,
    dinner,
    other,
    otherLabel: getSingleOtherExpenseLabel(otherItems),
    otherItems,
    note: expenseForm.note,
    createdAt: existingExpense?.createdAt ?? now,
    updatedAt: now,
  };
  const nextExpenses = [
    ...expenses.filter((expense) => expense.date !== expenseForm.date),
    newExpense,
  ];

  markLocalChanged("Đã sửa chi tiêu, đang lưu cloud...");

  setExpenses(nextExpenses);
  recordAppChange({
    action: existingExpense ? "update" : "create",
    title: existingExpense ? "Cập nhật chi tiêu" : "Thêm chi tiêu",
    description: `Chi tiêu ngày ${savedDate}.`,
    date: savedDate,
    patches: [
      createAppChangePatch({
        key: "expenses",
        before: expenses,
        after: nextExpenses,
        beforeSummary: describeExpenseEntry(existingExpense),
        afterSummary: describeExpenseEntry(newExpense),
      }),
    ],
  });

  setSelectedDate(savedDate);
  setEditingExpenseDate(null);

  setExpenseForm({
    date: getToday(),
    breakfast: "",
    lunch: "",
    dinner: "",
    otherItems: [createOtherExpenseItemForm()],
    note: "",
  });

  setSyncStatus(editingExpenseDate ? "Đã cập nhật chi tiêu" : "Đã lưu chi tiêu");
}

function handleCloseDaySubmit(event: React.FormEvent) {
  event.preventDefault();

  if (!closeDayForm.date) {
    alert("Bạn chưa chọn ngày chốt.");
    return;
  }

  const income = parseMoneyInput(closeDayForm.income);
  const bonusMoney = parseMoneyInput(closeDayForm.bonusMoney);
  const receivedMoney = parseMoneyInput(closeDayForm.receivedMoney);
  const breakfast =
    closeDayForm.expenseMode === "meals"
      ? parseMoneyInput(closeDayForm.breakfast)
      : 0;
  const lunch =
    closeDayForm.expenseMode === "meals"
      ? parseMoneyInput(closeDayForm.lunch)
      : 0;
  const dinner =
    closeDayForm.expenseMode === "meals"
      ? parseMoneyInput(closeDayForm.dinner)
      : 0;
  const otherItems =
    closeDayForm.expenseMode === "meals"
      ? normalizeOtherExpenseItems(closeDayForm.otherItems)
      : [];
  const other =
    closeDayForm.expenseMode === "meals"
      ? otherItems.reduce((sum, item) => sum + item.amount, 0)
      : parseMoneyInput(closeDayForm.expenseTotal);
  const expenseTotal = breakfast + lunch + dinner + other;
  const note = closeDayForm.note.trim();

  if (!income && !bonusMoney && !receivedMoney && !expenseTotal && !note) {
    alert("Bạn chưa nhập dữ liệu nào để chốt ngày.");
    return;
  }

  const now = new Date().toISOString();
  const savedDate = closeDayForm.date;
  const existingEntry = entries.find((entry) => entry.date === savedDate);
  const newEntry: DailyEntry = {
    id: existingEntry?.id ?? crypto.randomUUID(),
    date: savedDate,
    diary: note || existingEntry?.diary || "",
    income,
    receivedMoney,
    bonusMoney,
    orderCount: existingEntry?.orderCount ?? 0,
    workHours: roundWorkHours(existingEntry?.workHours ?? 0),
    mood: closeDayForm.mood,
    note: note || existingEntry?.note || "",
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
  };
  const nextEntries = [
    ...entries.filter((entry) => entry.date !== savedDate),
    newEntry,
  ];
  const existingExpense = expenses.find((expense) => expense.date === savedDate);
  const newExpense: ExpenseEntry = {
    id: existingExpense?.id ?? crypto.randomUUID(),
    date: savedDate,
    breakfast,
    lunch,
    dinner,
    other,
    otherLabel: getSingleOtherExpenseLabel(otherItems),
    otherItems,
    note: note || existingExpense?.note || "",
    createdAt: existingExpense?.createdAt ?? now,
    updatedAt: now,
  };
  const nextExpenses = [
    ...expenses.filter((expense) => expense.date !== savedDate),
    newExpense,
  ];

  markLocalChanged("Đã chốt ngày, đang lưu cloud...");

  setEntries(nextEntries);
  setExpenses(nextExpenses);
  recordAppChange({
    action: existingEntry || existingExpense ? "update" : "create",
    title: "Chốt ngày",
    description: `Chốt thu nhập, chi tiêu và ghi chú ngày ${savedDate}.`,
    date: savedDate,
    patches: [
      createAppChangePatch({
        key: "entries",
        before: entries,
        after: nextEntries,
        beforeSummary: describeDailyEntry(existingEntry),
        afterSummary: describeDailyEntry(newEntry),
      }),
      createAppChangePatch({
        key: "expenses",
        before: expenses,
        after: nextExpenses,
        beforeSummary: describeExpenseEntry(existingExpense),
        afterSummary: describeExpenseEntry(newExpense),
      }),
    ],
  });

  setSelectedDate(savedDate);
  setEditingDate(null);
  setEditingExpenseDate(null);
  setCloseDayForm(createCloseDayForm(getToday()));
  setSyncStatus("Đã chốt ngày");

  const activeSubGoals = (goals.subGoals ?? []).filter(
    (goal) => getSubGoalSaved(goal) < goal.target
  );
  const alreadyAllocatedToSubGoals = (goals.subGoals ?? []).reduce(
    (sum, goal) =>
      sum +
      goal.contributions
        .filter((contribution) => contribution.date === savedDate)
        .reduce((total, contribution) => total + contribution.amount, 0),
    0
  );
  const availableForSubGoals = Math.max(
    income + bonusMoney + receivedMoney - expenseTotal - alreadyAllocatedToSubGoals,
    0
  );
  const shouldOpenSubGoalAllocation =
    availableForSubGoals > 0 &&
    activeSubGoals.length > 0 &&
    confirm(
      `Ngày ${savedDate} còn dư ${formatMoney(
        availableForSubGoals
      )}. Bạn muốn chia tiền này vào mục tiêu phụ bây giờ không?`
    );

  if (shouldOpenSubGoalAllocation) {
    setSubGoalAllocationDateHint(savedDate);
    navigateTo("goals", "subGoals");
    return;
  }

  navigateTo("home", "menu");
}

function handleBalanceCheckSubmit(event: React.FormEvent) {
  event.preventDefault();

  if (isBalanceCheckSubmitting) return;

  if (!balanceCheckForm.date) {
    alert("Bạn chưa chọn ngày kiểm kê.");
    return;
  }

  const cash = parseMoneyInput(balanceCheckForm.cash);
  const bank = parseMoneyInput(balanceCheckForm.bank);

  if (cash < 0 || bank < 0) {
    alert("Tiền mặt và tiền tài khoản không được âm.");
    return;
  }

  setIsBalanceCheckSubmitting(true);

  const appMoney = getAppMoneyAtDate(balanceCheckForm.date);
  const actualMoney = cash + bank;
  const difference = actualMoney - appMoney;
  const now = new Date().toISOString();
  const existing = balanceChecks.find(
    (item) => item.date === balanceCheckForm.date
  );
  const newCheck: BalanceCheckEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    date: balanceCheckForm.date,
    cash,
    bank,
    appMoney,
    actualMoney,
    difference,
    note: balanceCheckForm.note,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const nextBalanceChecks = [
    ...balanceChecks.filter((item) => item.date !== balanceCheckForm.date),
    newCheck,
  ];

  markLocalChanged("Đã lưu kiểm kê số dư, đang lưu cloud...");
  balanceCheckDraftDirtyRef.current = false;

  setBalanceChecks(nextBalanceChecks);
  recordAppChange({
    action: existing ? "update" : "create",
    title: existing ? "Cập nhật kiểm kê số dư" : "Thêm kiểm kê số dư",
    description: `Kiểm kê ngày ${balanceCheckForm.date}.`,
    date: balanceCheckForm.date,
    patches: [
      createAppChangePatch({
        key: "balanceChecks",
        before: balanceChecks,
        after: nextBalanceChecks,
        beforeSummary: describeBalanceCheck(existing),
        afterSummary: describeBalanceCheck(newCheck),
      }),
    ],
  });

  setSyncStatus("Đã lưu kiểm kê số dư");
  window.requestAnimationFrame(() => {
    setBalanceCheckOverlay((current) => ({ ...current, isOpen: false }));
    setIsBalanceCheckSubmitting(false);
    alert("Đã thêm kiểm kê thành công.");
  });
}

function deleteBalanceCheck(id: string) {
  const checkToDelete = balanceChecks.find((item) => item.id === id);
  if (!checkToDelete) return;

  const nextBalanceChecks = balanceChecks.filter((item) => item.id !== id);

  markLocalChanged("Đã xóa kiểm kê số dư, đang lưu cloud...");

  setBalanceChecks(nextBalanceChecks);
  recordAppChange({
    action: "delete",
    title: "Xóa kiểm kê số dư",
    description: `Xóa kiểm kê ngày ${checkToDelete.date}.`,
    date: checkToDelete.date,
    patches: [
      createAppChangePatch({
        key: "balanceChecks",
        before: balanceChecks,
        after: nextBalanceChecks,
        beforeSummary: describeBalanceCheck(checkToDelete),
        afterSummary: "Đã xóa kiểm kê này.",
      }),
    ],
  });
}

function editBalanceCheck(item: BalanceCheckEntry) {
  openBalanceCheckOverlay(item.date, "edit");
}

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const income = parseMoneyInput(form.income);
    const receivedMoney = parseMoneyInput(form.receivedMoney);
    const bonusMoney = parseMoneyInput(form.bonusMoney);
    const orderCount = Number(form.orderCount);
    const workHours = roundWorkHours(Number(form.workHours));

    if (!form.date) {
      alert("Bạn chưa chọn ngày.");
      return;
    }

    if (
      income < 0 ||
      receivedMoney < 0 ||
      bonusMoney < 0 ||
      orderCount < 0 ||
      workHours < 0
    ) {
      alert("Số tiền, số lượng đơn và giờ làm không được âm.");
      return;
    }

    const savedDate = form.date;
    const now = new Date().toISOString();
    const existingEntry = entries.find((entry) => entry.date === form.date);
    const newEntry: DailyEntry = {
      id: existingEntry?.id ?? crypto.randomUUID(),
      date: form.date,
      diary: form.diary,
      income,
      receivedMoney,
      bonusMoney,
      orderCount,
      workHours,
      mood: form.mood,
      note: form.note,
      createdAt: existingEntry?.createdAt ?? now,
      updatedAt: now,
    };
    const nextEntries = [
      ...entries.filter((entry) => entry.date !== form.date),
      newEntry,
    ];

    markLocalChanged("Đã sửa nhật ký, đang lưu cloud...");

    setEntries(nextEntries);
    recordAppChange({
      action: existingEntry ? "update" : "create",
      title: existingEntry ? "Cập nhật nhật ký" : "Thêm nhật ký",
      description: `Nhật ký ngày ${savedDate}.`,
      date: savedDate,
      patches: [
        createAppChangePatch({
          key: "entries",
          before: entries,
          after: nextEntries,
          beforeSummary: describeDailyEntry(existingEntry),
          afterSummary: describeDailyEntry(newEntry),
        }),
      ],
    });

    setForm({
      date: getToday(),
      diary: "",
      income: "",
      receivedMoney: "",
      bonusMoney: "",
      orderCount: "",
      workHours: "",
      mood: "normal",
      note: "",
    });
  setEditingDate(null);
  setSelectedDate(savedDate);
  navigateTo("home", "menu");
  }

  function editEntry(entry: DailyEntry) {
  setForm({
    date: entry.date,
    diary: entry.diary,
    income: formatMoneyInput(String(entry.income ?? 0)),
    receivedMoney: formatMoneyInput(String(entry.receivedMoney ?? 0)),
    bonusMoney: formatMoneyInput(String(entry.bonusMoney ?? 0)),
    orderCount: String(entry.orderCount ?? 0),
    workHours: String(roundWorkHours(entry.workHours ?? 0)),
    mood: entry.mood,
    note: entry.note,
  });

  setSelectedDate(entry.date);
  setEditingDate(entry.date);
  navigateTo("entry");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function editExpense(expense: ExpenseEntry) {
  setExpenseForm({
    date: expense.date,
    breakfast: formatMoneyInput(String(expense.breakfast ?? 0)),
    lunch: formatMoneyInput(String(expense.lunch ?? 0)),
    dinner: formatMoneyInput(String(expense.dinner ?? 0)),
    otherItems: buildOtherExpenseFormItems(expense),
    note: expense.note,
  });

  setSelectedDate(expense.date);
  setEditingExpenseDate(expense.date);
  navigateTo("entry");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function deleteExpense(id: string) {
  const expenseToDelete = expenses.find((expense) => expense.id === id);
  if (!expenseToDelete) return;

  const nextExpenses = expenses.filter((expense) => expense.id !== id);

  markLocalChanged("Đã xóa chi tiêu, đang lưu cloud...");

  setExpenses(nextExpenses);
  recordAppChange({
    action: "delete",
    title: "Xóa chi tiêu",
    description: `Xóa chi tiêu ngày ${expenseToDelete.date}.`,
    date: expenseToDelete.date,
    patches: [
      createAppChangePatch({
        key: "expenses",
        before: expenses,
        after: nextExpenses,
        beforeSummary: describeExpenseEntry(expenseToDelete),
        afterSummary: "Đã xóa chi tiêu này.",
      }),
    ],
  });
}

function deleteEntry(id: string) {
  const entryToDelete = entries.find((entry) => entry.id === id);
  if (!entryToDelete) return;

  const nextEntries = entries.filter((entry) => entry.id !== id);

  markLocalChanged("Đã xóa nhật ký, đang lưu cloud...");

  setEntries(nextEntries);
  recordAppChange({
    action: "delete",
    title: "Xóa nhật ký",
    description: `Xóa nhật ký ngày ${entryToDelete.date}.`,
    date: entryToDelete.date,
    patches: [
      createAppChangePatch({
        key: "entries",
        before: entries,
        after: nextEntries,
        beforeSummary: describeDailyEntry(entryToDelete),
        afterSummary: "Đã xóa nhật ký này.",
      }),
    ],
  });
}

function completeCurrentGoal() {
  const confirmed = confirm(
    "Bạn có chắc muốn hoàn thành mục tiêu này không? Hành trình hiện tại sẽ được lưu vào mục tiêu đã hoàn thành và dữ liệu hiện tại sẽ reset về 0."
  );

  if (!confirmed) return;

  markLocalChanged("Đã hoàn thành mục tiêu chính, đang lưu cloud...");

  const startDate = goals.bigGoalStartDate ?? getToday();
  const endDate = getToday();

  const entriesSnapshot = entries.filter(
    (entry) => entry.date >= startDate && entry.date <= endDate
  );

  const expensesSnapshot = expenses.filter(
    (expense) => expense.date >= startDate && expense.date <= endDate
  );

  const balanceChecksSnapshot = balanceChecks.filter(
    (item) => item.date >= startDate && item.date <= endDate
  );

  const goalTotalIncome = entriesSnapshot.reduce(
    (sum, entry) => sum + getTotalEntryMoney(entry),
    0
  );

  const goalTotalExpense = expensesSnapshot.reduce(
    (sum, expense) => sum + getExpenseTotal(expense),
    0
  );

  const goalTotalHours = entriesSnapshot.reduce(
    (sum, entry) => sum + entry.workHours,
    0
  );

  const goalTotalOrders = entriesSnapshot.reduce(
    (sum, entry) => sum + (entry.orderCount ?? 0),
    0
  );

  const goalTotalJourneyMoney = goalTotalIncome;

  const goalActualMoney =
    goals.bigGoalSaved + goalTotalIncome - goalTotalExpense;

  const balanceSnapshots = buildBalanceMovementData(
    startDate,
    endDate,
    goals.bigGoalSaved
  );

  const completedGoal: CompletedGoal = {
    id: crypto.randomUUID(),
    goalType: "main",
    name: goals.bigGoalName,
    target: goals.bigGoalTarget,
    saved: goalActualMoney,
    deadline: goals.bigGoalDeadline,
    completedAt: getToday(),
    startDate,

    totalIncome: goalTotalIncome,
    totalExpense: goalTotalExpense,
    actualMoney: goalActualMoney,
    totalJourneyMoney: goalTotalJourneyMoney,
    totalHours: goalTotalHours,
    totalOrders: goalTotalOrders,

    entriesSnapshot,
    expensesSnapshot,
    balanceSnapshots,
    balanceChecksSnapshot,
  };
  const nextCompletedGoals = [completedGoal, ...completedGoals];
  const nextGoals = {
    ...goals,
    bigGoalName: "Mục tiêu mới",
    bigGoalTarget: 0,
    bigGoalSaved: 0,
    bigGoalDeadline: getToday(),
    bigGoalStartDate: getToday(),
  };

  setCompletedGoals(nextCompletedGoals);
  setEntries([]);
  setExpenses([]);
  setBalanceChecks([]);
  setGoals(nextGoals);
  recordAppChange({
    action: "complete",
    title: "Hoàn thành mục tiêu chính",
    description: `Lưu hành trình "${completedGoal.name}" vào mục tiêu đã hoàn thành và reset dữ liệu hiện tại.`,
    date: completedGoal.completedAt,
    patches: [
      createAppChangePatch({
        key: "completedGoals",
        before: completedGoals,
        after: nextCompletedGoals,
        beforeSummary: `${completedGoals.length} mục tiêu đã hoàn thành.`,
        afterSummary: describeCompletedGoal(completedGoal),
      }),
      createAppChangePatch({
        key: "entries",
        before: entries,
        after: [],
        beforeSummary: describeCollectionSnapshot("entries", entries),
        afterSummary: "Đã reset nhật ký hiện tại.",
      }),
      createAppChangePatch({
        key: "expenses",
        before: expenses,
        after: [],
        beforeSummary: describeCollectionSnapshot("expenses", expenses),
        afterSummary: "Đã reset chi tiêu hiện tại.",
      }),
      createAppChangePatch({
        key: "balanceChecks",
        before: balanceChecks,
        after: [],
        beforeSummary: describeCollectionSnapshot("balanceChecks", balanceChecks),
        afterSummary: "Đã reset kiểm kê hiện tại.",
      }),
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeMainGoal(goals),
        afterSummary: describeMainGoal(nextGoals),
      }),
    ],
  });

  setSelectedDate(getToday());
  setEditingDate(null);

  navigateTo("goals", "completed");
}

function resetSubGoalForm() {
  setSubGoalForm({
    name: "",
    target: "",
    saved: "",
    deadline: getToday(),
    startDate: getToday(),
  });
  setEditingSubGoalId(null);
}

function validateSubGoalForm() {
  const name = subGoalForm.name.trim();
  const target = parseMoneyInput(subGoalForm.target);
  const saved = parseMoneyInput(subGoalForm.saved);

  if (!name) {
    alert("Bạn chưa nhập tên mục tiêu phụ.");
    return;
  }

  if (target <= 0) {
    alert("Số tiền cần đạt phải lớn hơn 0.");
    return;
  }

  if (!subGoalForm.startDate || !subGoalForm.deadline) {
    alert("Bạn cần nhập ngày bắt đầu và hạn mục tiêu.");
    return null;
  }

  return {
    name,
    target,
    saved,
    deadline: subGoalForm.deadline,
    startDate: subGoalForm.startDate,
  };
}

function addSubGoal() {
  const validatedSubGoal = validateSubGoalForm();

  if (!validatedSubGoal) return;

  const now = new Date().toISOString();

  const newSubGoal: SubGoal = {
    id: crypto.randomUUID(),
    ...validatedSubGoal,
    contributions: [],
    createdAt: now,
    updatedAt: now,
  };
  const nextGoals = {
    ...goals,
    subGoals: [...(goals.subGoals ?? []), newSubGoal],
  };

  markLocalChanged("Đã thêm mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "create",
    title: "Thêm mục tiêu phụ",
    description: `Thêm mục tiêu phụ "${newSubGoal.name}".`,
    date: newSubGoal.startDate,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: `${goals.subGoals?.length ?? 0} mục tiêu phụ.`,
        afterSummary: describeSubGoal(newSubGoal),
      }),
    ],
  });

  resetSubGoalForm();
}

function startEditSubGoal(goal: SubGoal) {
  setEditingSubGoalId(goal.id);
  setSubGoalForm({
    name: goal.name,
    target: formatMoneyInput(String(goal.target ?? 0)),
    saved: formatMoneyInput(String(goal.saved ?? 0)),
    deadline: goal.deadline,
    startDate: goal.startDate,
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function cancelEditSubGoal() {
  resetSubGoalForm();
}

function saveSubGoalEdit() {
  if (!editingSubGoalId) return;

  const subGoalToUpdate = (goals.subGoals ?? []).find(
    (goal) => goal.id === editingSubGoalId
  );

  if (!subGoalToUpdate) {
    resetSubGoalForm();
    return;
  }

  const validatedSubGoal = validateSubGoalForm();

  if (!validatedSubGoal) return;

  const now = new Date().toISOString();
  const updatedSubGoal: SubGoal = {
    ...subGoalToUpdate,
    ...validatedSubGoal,
    updatedAt: now,
  };
  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).map((goal) =>
      goal.id === editingSubGoalId ? updatedSubGoal : goal
    ),
  };

  markLocalChanged("Đã cập nhật mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "update",
    title: "Cập nhật mục tiêu phụ",
    description: `Cập nhật mục tiêu phụ "${updatedSubGoal.name}".`,
    date: updatedSubGoal.startDate,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeSubGoal(subGoalToUpdate),
        afterSummary: describeSubGoal(updatedSubGoal),
      }),
    ],
  });

  resetSubGoalForm();
}

function deleteSubGoal(id: string) {
  const subGoalToDelete = (goals.subGoals ?? []).find((goal) => goal.id === id);
  if (!subGoalToDelete) return;

  const confirmed = confirm("Bạn có chắc muốn xóa mục tiêu phụ này không?");
  if (!confirmed) return;

  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).filter((goal) => goal.id !== id),
  };

  markLocalChanged("Đã xóa mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  if (editingSubGoalId === id) {
    resetSubGoalForm();
  }
  recordAppChange({
    action: "delete",
    title: "Xóa mục tiêu phụ",
    description: `Xóa mục tiêu phụ "${subGoalToDelete.name}".`,
    date: subGoalToDelete.startDate,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeSubGoal(subGoalToDelete),
        afterSummary: "Đã xóa mục tiêu phụ này.",
      }),
    ],
  });
}

function addContributionToSubGoal(goalId: string) {
  const form = subGoalContributionForms[goalId];

  if (!form) return;

  const amount = parseMoneyInput(form.amount);
  const note = form.note.trim();

  if (amount <= 0) {
    alert("Số tiền góp phải lớn hơn 0.");
    return;
  }

  const now = new Date().toISOString();

  const contribution: GoalContribution = {
    id: crypto.randomUUID(),
    date: getToday(),
    amount,
    note,
    createdAt: now,
    updatedAt: now,
  };
  const targetGoal = (goals.subGoals ?? []).find((goal) => goal.id === goalId);
  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).map((goal) => {
      if (goal.id !== goalId) return goal;

      return {
        ...goal,
        contributions: [...goal.contributions, contribution],
        updatedAt: now,
      };
    }),
  };
  const nextGoal = (nextGoals.subGoals ?? []).find((goal) => goal.id === goalId);

  markLocalChanged("Đã góp tiền vào mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "update",
    title: "Góp tiền mục tiêu phụ",
    description: targetGoal
      ? `Góp ${formatMoney(amount)} vào "${targetGoal.name}".`
      : `Góp ${formatMoney(amount)} vào mục tiêu phụ.`,
    date: contribution.date,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeSubGoal(targetGoal),
        afterSummary: describeSubGoal(nextGoal),
      }),
    ],
  });

  setSubGoalContributionForms((prev) => ({
    ...prev,
    [goalId]: {
      amount: "",
      note: "",
    },
  }));
}

function updateSubGoalContribution(
  goalId: string,
  contributionId: string,
  payload: { amount: string; date: string; note: string }
) {
  const targetGoal = (goals.subGoals ?? []).find((goal) => goal.id === goalId);
  const contributionToUpdate = targetGoal?.contributions.find(
    (item) => item.id === contributionId
  );

  if (!targetGoal || !contributionToUpdate) return;

  const amount = parseMoneyInput(payload.amount);
  const date = payload.date;
  const note = payload.note.trim();

  if (!date) {
    alert("Bạn chưa chọn ngày góp.");
    return;
  }

  if (amount <= 0) {
    alert("Số tiền góp phải lớn hơn 0.");
    return;
  }

  const now = new Date().toISOString();
  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).map((goal) => {
      if (goal.id !== goalId) return goal;

      return {
        ...goal,
        contributions: goal.contributions.map((item) =>
          item.id === contributionId
            ? {
                ...item,
                amount,
                date,
                note,
                updatedAt: now,
              }
            : item
        ),
        updatedAt: now,
      };
    }),
  };
  const nextGoal = (nextGoals.subGoals ?? []).find((goal) => goal.id === goalId);

  markLocalChanged("Đã cập nhật lần góp mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "update",
    title: "Cập nhật lần góp mục tiêu phụ",
    description: `Cập nhật lần góp ${formatMoney(
      contributionToUpdate.amount
    )} trong "${targetGoal.name}".`,
    date,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeSubGoal(targetGoal),
        afterSummary: describeSubGoal(nextGoal),
      }),
    ],
  });
}

function deleteSubGoalContribution(goalId: string, contributionId: string) {
  const targetGoal = (goals.subGoals ?? []).find((goal) => goal.id === goalId);
  const contributionToDelete = targetGoal?.contributions.find(
    (item) => item.id === contributionId
  );

  if (!targetGoal || !contributionToDelete) return;

  const confirmed = confirm(
    `Xóa lần góp ${formatMoney(contributionToDelete.amount)} khỏi "${targetGoal.name}"?`
  );

  if (!confirmed) return;

  const now = new Date().toISOString();
  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).map((goal) => {
      if (goal.id !== goalId) return goal;

      return {
        ...goal,
        contributions: goal.contributions.filter(
          (item) => item.id !== contributionId
        ),
        updatedAt: now,
      };
    }),
  };
  const nextGoal = (nextGoals.subGoals ?? []).find((goal) => goal.id === goalId);

  markLocalChanged("Đã xóa lần góp mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "delete",
    title: "Xóa lần góp mục tiêu phụ",
    description: `Xóa lần góp ${formatMoney(
      contributionToDelete.amount
    )} khỏi "${targetGoal.name}".`,
    date: contributionToDelete.date,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeSubGoal(targetGoal),
        afterSummary: describeSubGoal(nextGoal),
      }),
    ],
  });
}

function getSubGoalAllocationAvailable(date: string) {
  const entry = entries.find((item) => item.date === date);
  const expense = expenses.find((item) => item.date === date);
  const income = entry ? getTotalEntryMoney(entry) : 0;
  const expenseTotal = expense ? getExpenseTotal(expense) : 0;
  const alreadyAllocated = (goals.subGoals ?? []).reduce((sum, goal) => {
    return (
      sum +
      goal.contributions
        .filter((item) => item.date === date)
        .reduce((total, item) => total + item.amount, 0)
    );
  }, 0);

  return Math.max(income - expenseTotal - alreadyAllocated, 0);
}

function applySubGoalAllocation({
  allocations,
  date,
}: {
  allocations: Array<{ amount: number; goalId: string }>;
  date: string;
}) {
  if (!date) {
    alert("Bạn chưa chọn ngày để chia tiền.");
    return false;
  }

  const validAllocations = allocations.filter(
    (item) => item.amount > 0 && (goals.subGoals ?? []).some((goal) => goal.id === item.goalId)
  );
  const totalAllocation = validAllocations.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  if (validAllocations.length === 0 || totalAllocation <= 0) {
    alert("Bạn chưa nhập số tiền cần chia vào mục tiêu phụ.");
    return false;
  }

  const availableMoney = getSubGoalAllocationAvailable(date);

  if (totalAllocation > availableMoney) {
    alert(
      `Số tiền chia đang vượt tiền dư của ngày ${date}: ${formatMoney(
        availableMoney
      )}.`
    );
    return false;
  }

  const now = new Date().toISOString();
  const allocationMap = new Map(
    validAllocations.map((item) => [item.goalId, item.amount])
  );
  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).map((goal) => {
      const amount = allocationMap.get(goal.id) ?? 0;

      if (amount <= 0) return goal;

      return {
        ...goal,
        contributions: [
          ...goal.contributions,
          {
            id: crypto.randomUUID(),
            amount,
            date,
            note: "Tự chia tiền dư trong ngày",
            createdAt: now,
            updatedAt: now,
          },
        ],
        updatedAt: now,
      };
    }),
  };

  markLocalChanged("Đã tự chia tiền vào mục tiêu phụ, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "update",
    title: "Tự chia tiền vào mục tiêu phụ",
    description: `Chia ${formatMoney(totalAllocation)} từ ngày ${date} vào ${
      validAllocations.length
    } mục tiêu phụ.`,
    date,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeMainGoal(goals),
        afterSummary: describeMainGoal(nextGoals),
      }),
    ],
  });

  return true;
}

function completeSubGoal(goalId: string) {
  const goal = (goals.subGoals ?? []).find((item) => item.id === goalId);

  if (!goal) return;

  const confirmed = confirm(`Hoàn thành mục tiêu phụ "${goal.name}"?`);
  if (!confirmed) return;

  const startDate = goal.startDate;
  const endDate = getToday();

  const entriesSnapshot = entries.filter(
    (entry) => entry.date >= startDate && entry.date <= endDate
  );

  const expensesSnapshot = expenses.filter(
    (expense) => expense.date >= startDate && expense.date <= endDate
  );

  const totalHours = entriesSnapshot.reduce(
    (sum, entry) => sum + entry.workHours,
    0
  );

  const totalOrders = entriesSnapshot.reduce(
    (sum, entry) => sum + (entry.orderCount ?? 0),
    0
  );

  const totalContributed = goal.contributions.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const currentSaved = getSubGoalSaved(goal);

  const completedGoal: CompletedGoal = {
    id: crypto.randomUUID(),
    goalType: "sub",
    name: goal.name,
    target: goal.target,
    saved: currentSaved,
    deadline: goal.deadline,
    completedAt: getToday(),
    startDate: goal.startDate,

    totalIncome: totalContributed,
    actualMoney: currentSaved,
    totalJourneyMoney: currentSaved,
    totalHours,
    totalOrders,

    entriesSnapshot,
    expensesSnapshot,
    contributionsSnapshot: goal.contributions,
    goalProgressSnapshots: buildSubGoalProgressData(goal),
  };
  const nextCompletedGoals = [completedGoal, ...completedGoals];
  const nextGoals = {
    ...goals,
    subGoals: (goals.subGoals ?? []).filter((item) => item.id !== goalId),
  };

  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud..."); 

  setCompletedGoals(nextCompletedGoals);
  setGoals(nextGoals);
  if (editingSubGoalId === goalId) {
    resetSubGoalForm();
  }
  recordAppChange({
    action: "complete",
    title: "Hoàn thành mục tiêu phụ",
    description: `Hoàn thành mục tiêu phụ "${goal.name}".`,
    date: completedGoal.completedAt,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeSubGoal(goal),
        afterSummary: "Đã chuyển mục tiêu phụ sang danh sách hoàn thành.",
      }),
      createAppChangePatch({
        key: "completedGoals",
        before: completedGoals,
        after: nextCompletedGoals,
        beforeSummary: `${completedGoals.length} mục tiêu đã hoàn thành.`,
        afterSummary: describeCompletedGoal(completedGoal),
      }),
    ],
  });

  navigateTo("goals", "completed");
}

function deleteCompletedGoal(id: string) {
  const completedGoalToDelete = completedGoals.find((goal) => goal.id === id);
  if (!completedGoalToDelete) return;

  const confirmed = confirm(
    "Bạn có chắc muốn xóa mục tiêu đã hoàn thành này không?"
  );

  if (!confirmed) return;

  const nextCompletedGoals = completedGoals.filter((goal) => goal.id !== id);

  markLocalChanged("Đã xóa mục tiêu hoàn thành, đang lưu cloud...");

  setCompletedGoals(nextCompletedGoals);
  recordAppChange({
    action: "delete",
    title: "Xóa mục tiêu đã hoàn thành",
    description: `Xóa mục tiêu đã hoàn thành "${completedGoalToDelete.name}".`,
    date: completedGoalToDelete.completedAt,
    patches: [
      createAppChangePatch({
        key: "completedGoals",
        before: completedGoals,
        after: nextCompletedGoals,
        beforeSummary: describeCompletedGoal(completedGoalToDelete),
        afterSummary: "Đã xóa mục tiêu hoàn thành này.",
      }),
    ],
  });
}

function updateGoal(key: keyof Goals, value: string) {
  const textFields: Array<keyof Goals> = [
    "bigGoalName",
    "bigGoalDeadline",
    "bigGoalStartDate",
  ];
  const fieldLabels: Partial<Record<keyof Goals, string>> = {
    dailyIncome: "Tiền / ngày",
    dailyHours: "Giờ làm / ngày",
    weeklyIncome: "Tiền / tuần",
    weeklyHours: "Giờ làm / tuần",
    monthlyIncome: "Tiền / tháng",
    monthlyHours: "Giờ làm / tháng",
  };
  const nextValue = textFields.includes(key) ? value : Number(value);
  const previousValue = goals[key];

  if (previousValue === nextValue) return;

  const nextGoals = {
    ...goals,
    [key]: nextValue,
  };

  markLocalChanged("Đã cập nhật mục tiêu, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "update",
    title: "Cập nhật mốc mục tiêu",
    description: `Cập nhật ${fieldLabels[key] ?? String(key)}.`,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: `${fieldLabels[key] ?? String(key)}: ${previousValue}`,
        afterSummary: `${fieldLabels[key] ?? String(key)}: ${nextValue}`,
      }),
    ],
  });
}

function saveMainGoal() {
  const name = mainGoalForm.bigGoalName.trim();
  const target = parseMoneyInput(mainGoalForm.bigGoalTarget);
  const saved = parseMoneyInput(mainGoalForm.bigGoalSaved);

  if (!name) {
    alert("Bạn chưa nhập tên mục tiêu lớn.");
    return;
  }

  if (target < 0 || saved < 0) {
    alert("Số tiền không được âm.");
    return;
  }

  if (!mainGoalForm.bigGoalStartDate || !mainGoalForm.bigGoalDeadline) {
    alert("Bạn cần nhập ngày bắt đầu và hạn mục tiêu.");
    return;
  }
  const nextGoals = {
    ...goals,
    bigGoalName: name,
    bigGoalTarget: target,
    bigGoalSaved: saved,
    bigGoalStartDate: mainGoalForm.bigGoalStartDate,
    bigGoalDeadline: mainGoalForm.bigGoalDeadline,
  };

  markLocalChanged("Đã lưu mục tiêu lớn, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: "update",
    title: "Lưu mục tiêu lớn",
    description: `Cập nhật mục tiêu lớn "${name}".`,
    date: nextGoals.bigGoalStartDate,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: describeMainGoal(goals),
        afterSummary: describeMainGoal(nextGoals),
      }),
    ],
  });

  alert("Đã lưu mục tiêu lớn.");
}

function resetExpenseBudgetForm() {
  setExpenseBudgetForm({
    label: "Ăn uống",
    monthlyLimit: "",
  });
  setEditingExpenseBudgetId(null);
}

function startEditExpenseBudget(budget: ExpenseBudget) {
  setEditingExpenseBudgetId(budget.id);
  setExpenseBudgetForm({
    label: budget.label,
    monthlyLimit: formatMoneyInput(String(budget.monthlyLimit ?? 0)),
  });
}

function cancelEditExpenseBudget() {
  resetExpenseBudgetForm();
}

function saveExpenseBudget() {
  const label = expenseBudgetForm.label.trim();
  const monthlyLimit = parseMoneyInput(expenseBudgetForm.monthlyLimit);

  if (!label) {
    alert("Bạn chưa chọn hoặc nhập nhãn ngân sách.");
    return;
  }

  if (monthlyLimit <= 0) {
    alert("Ngân sách tháng phải lớn hơn 0.");
    return;
  }

  const now = new Date().toISOString();
  const currentBudgets = goals.expenseBudgets ?? [];
  const existingBudget = editingExpenseBudgetId
    ? currentBudgets.find((item) => item.id === editingExpenseBudgetId)
    : null;
  const normalizedLabel = label.toLocaleLowerCase("vi");
  const duplicatedBudget = currentBudgets.find((item) => {
    if (item.id === editingExpenseBudgetId) return false;

    return item.label.trim().toLocaleLowerCase("vi") === normalizedLabel;
  });

  if (duplicatedBudget) {
    alert("Nhãn này đã có ngân sách. Bạn hãy sửa ngân sách cũ thay vì thêm trùng.");
    return;
  }

  const nextBudget: ExpenseBudget = existingBudget
    ? {
        ...existingBudget,
        label,
        monthlyLimit,
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        label,
        monthlyLimit,
        createdAt: now,
        updatedAt: now,
      };
  const nextGoals = {
    ...goals,
    expenseBudgets: existingBudget
      ? currentBudgets.map((item) =>
          item.id === existingBudget.id ? nextBudget : item
        )
      : [nextBudget, ...currentBudgets],
  };

  markLocalChanged("Đã lưu ngân sách chi tiêu, đang lưu cloud...");

  setGoals(nextGoals);
  recordAppChange({
    action: existingBudget ? "update" : "create",
    title: existingBudget
      ? "Cập nhật ngân sách chi tiêu"
      : "Thêm ngân sách chi tiêu",
    description: `${label}: ${formatMoney(monthlyLimit)}/tháng.`,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: `${currentBudgets.length} ngân sách chi tiêu.`,
        afterSummary: `${nextGoals.expenseBudgets.length} ngân sách chi tiêu.`,
      }),
    ],
  });

  resetExpenseBudgetForm();
}

function deleteExpenseBudget(id: string) {
  const currentBudgets = goals.expenseBudgets ?? [];
  const budgetToDelete = currentBudgets.find((item) => item.id === id);

  if (!budgetToDelete) return;

  const confirmed = confirm(
    `Xóa ngân sách "${budgetToDelete.label}" ${formatMoney(
      budgetToDelete.monthlyLimit
    )}/tháng?`
  );

  if (!confirmed) return;

  const nextGoals = {
    ...goals,
    expenseBudgets: currentBudgets.filter((item) => item.id !== id),
  };

  markLocalChanged("Đã xóa ngân sách chi tiêu, đang lưu cloud...");

  setGoals(nextGoals);
  if (editingExpenseBudgetId === id) {
    resetExpenseBudgetForm();
  }
  recordAppChange({
    action: "delete",
    title: "Xóa ngân sách chi tiêu",
    description: `Xóa ngân sách "${budgetToDelete.label}".`,
    patches: [
      createAppChangePatch({
        key: "goals",
        before: goals,
        after: nextGoals,
        beforeSummary: `${currentBudgets.length} ngân sách chi tiêu.`,
        afterSummary: `${nextGoals.expenseBudgets.length} ngân sách chi tiêu.`,
      }),
    ],
  });
}

function exportToWord() {
  exportWordReport({
    entries,
    expenses,
    balanceChecks,
    completedGoals,
    goals,
    totalIncome,
    totalExpense,
    actualMoney,
    totalSavedForBigGoal,
    remainingBigGoal,
    bigGoalProgress,
    bigGoalTimeProgress,
    needPerDay,
    isBigGoalBehind,
    safeForecastDays,
    goalForecast,
    currentBalanceMovementData,
    getBalanceStatus,
  });
}

if (!session) {
  return (
    <div className="app-shell-bg min-h-[100dvh] text-[var(--text-primary)]">
      <AuthPage
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        handleLogin={handleLogin}
        handleSignUp={handleSignUp}
        supabaseEnvError={supabaseEnvError}
        themeMode={themeMode}
        toggleThemeMode={toggleThemeMode}
      />
    </div>
  );
}

if (route.kind === "hub" || route.kind === "login" || route.kind === "unknown") {
  return (
    <HubSelectionPage
      email={session.user.email}
      onLogout={handleLogout}
      onOpenDayMark={openDayMarkApp}
      onOpenMoneyDiary={openMoneyDiaryApp}
      themeMode={themeMode}
      toggleThemeMode={toggleThemeMode}
    />
  );
}

if (route.kind === "daymark") {
  return (
    <DayMarkApp
      currentRoute={route.dayMarkRoute}
      email={session.user.email}
      onLogout={handleLogout}
      onNavigate={navigateApp}
      onSwitchApp={openAppHub}
      themeMode={themeMode}
      toggleThemeMode={toggleThemeMode}
      userId={session.user.id}
    />
  );
}

  return (
    <MoneyPageShell
      currentPage={page}
      email={session.user.email}
      isCloudRefreshing={isCloudRefreshing}
      navigateTo={navigateTo}
      onExportReport={exportToWord}
      onLogout={handleLogout}
      onOpenBalanceCheck={goToTodayBalanceCheck}
      onOpenChangeLog={() => navigateTo("changes")}
      onOpenCloseDay={() => openCloseDay()}
      onOpenExpense={goToTodayEntryForm}
      onOpenIncome={() => navigateTo("hub")}
      onRetrySync={() => void retryCloudLoad()}
      onSwitchApp={openAppHub}
      syncStatus={syncStatus}
      themeMode={themeMode}
      toggleThemeMode={toggleThemeMode}
    >
          {page === "home" && (
            <HomePage
              entries={entries}
              expenses={expenses}
              balanceChecks={balanceChecks}
              cloudLoadError={cloudLoadError}
              isCloudLoading={isCloudLoading}
              isSelectedToday={isSelectedToday}
              selectedDate={selectedDate}
              goals={goals}
              daysLeft={daysLeft}
              goToPreviousDay={goToPreviousDay}
              goToNextDay={goToNextDay}
              goToToday={goToToday}
              handleSelectDate={handleSelectDate}
              todayString={todayString}
              todayGoalPaceRemaining={todayGoalPaceRemaining}
              needPerDay={needPerDay}
              todayActualIncome={todayActualIncome}
              todayDailyIncomeRemaining={todayDailyIncomeRemaining}
              todayWorkActualIncome={todayWorkActualIncome}
              todayEntry={todayEntry}
              todayExpense={todayExpense}
              todayBalanceCheck={todayBalanceCheck}
              todayExpenseTotal={todayExpenseTotal}
              dataWarnings={dataWarnings}
              goToTodayEntryForm={goToTodayEntryForm}
              goToTodayBalanceCheck={goToTodayBalanceCheck}
              openCloseDay={() => openCloseDay(selectedDate)}
              onDataWarningAction={handleDataWarningAction}
              selectedActualIncome={selectedActualIncome}
              selectedEntry={selectedEntry}
              selectedExpense={selectedExpense}
              selectedBalanceCheck={selectedBalanceCheck}
              selectedAppMoney={getAppMoneyAtDate(selectedDate)}
              selectedMainIncome={selectedMainIncome}
              selectedBonusMoney={selectedBonusMoney}
              selectedExpenseTotal={selectedExpenseTotal}
              selectedReceivedMoney={selectedReceivedMoney}
              selectedHours={selectedHours}
              weekIncome={weekIncome}
              monthIncome={monthIncome}
              actualMoney={actualMoney}
              totalJourneyMoney={totalJourneyMoney}
              onOpenSelectedBalanceDetails={() =>
                openBalanceCheckOverlay(selectedDate, "details")
              }
              onOpenSelectedBalanceEditor={() =>
                openBalanceCheckOverlay(selectedDate, "edit")
              }
              retryCloudLoad={retryCloudLoad}
              navigateTo={navigateTo}
            />
          )}
          {page === "goals" && (
            <GoalsPage
              addContributionToSubGoal={addContributionToSubGoal}
              addSubGoal={addSubGoal}
              applySubGoalAllocation={applySubGoalAllocation}
              balanceChartDays={balanceChartDays}
              balanceChartTitle={balanceChartTitle}
              bigGoalProgress={bigGoalProgress}
              bigGoalTimeProgress={bigGoalTimeProgress}
              cancelEditSubGoal={cancelEditSubGoal}
              chartData={chartData}
              chartDays={chartDays}
              completeCurrentGoal={completeCurrentGoal}
              completedGoals={completedGoals}
              completeSubGoal={completeSubGoal}
              currentBalanceMovementData={currentBalanceMovementData}
              currentGoalStartDate={currentGoalStartDate}
              daysLeft={daysLeft}
              deleteCompletedGoal={deleteCompletedGoal}
              deleteSubGoalContribution={deleteSubGoalContribution}
              deleteSubGoal={deleteSubGoal}
              editingSubGoalId={editingSubGoalId}
              forecastDays={forecastDays}
              form={form}
              goalForecast={goalForecast}
              goals={goals}
              goalId={goalId}
              goalScreen={goalScreen}
              getSubGoalAllocationAvailable={getSubGoalAllocationAvailable}
              incomePerHour={incomePerHour}
              isBigGoalBehind={isBigGoalBehind}
              mainGoalForm={mainGoalForm}
              navigateTo={navigateTo}
              needPerDay={needPerDay}
              remainingBigGoal={remainingBigGoal}
              safeChartDays={safeChartDays}
              safeForecastDays={safeForecastDays}
              saveMainGoal={saveMainGoal}
              saveSubGoalEdit={saveSubGoalEdit}
              selectedCompletedGoal={selectedCompletedGoal}
              setBalanceChartDays={setBalanceChartDays}
              setChartDays={setChartDays}
              setForecastDays={setForecastDays}
              setForm={setForm}
              setMainGoalForm={setMainGoalForm}
              setSelectedCompletedGoalId={setSelectedCompletedGoalId}
              startEditSubGoal={startEditSubGoal}
              setSubGoalContributionForms={setSubGoalContributionForms}
              setSubGoalForm={setSubGoalForm}
              subGoalAllocationDateHint={subGoalAllocationDateHint}
              subGoalContributionForms={subGoalContributionForms}
              subGoalForm={subGoalForm}
              todayString={todayString}
              totalSavedForBigGoal={totalSavedForBigGoal}
              updateSubGoalContribution={updateSubGoalContribution}
              updateGoal={updateGoal}
              visibleBalanceMovementData={visibleBalanceMovementData}
            />
          )}
          {page === "closeDay" && (
            <CloseDayPage
              form={closeDayForm}
              setForm={setCloseDayForm}
              onDateChange={handleCloseDayDateChange}
              onSubmit={handleCloseDaySubmit}
              todayString={todayString}
              navigateTo={navigateTo}
            />
          )}
  {page === "entry" && (
    <EntryPage
      editingDate={editingDate}
      editingExpenseDate={editingExpenseDate}
      form={form}
      setForm={setForm}
      expenseForm={expenseForm}
      setExpenseForm={setExpenseForm}
      handleSubmit={handleSubmit}
      handleExpenseSubmit={handleExpenseSubmit}
      setEditingDate={setEditingDate}
      setEditingExpenseDate={setEditingExpenseDate}
      todayString={todayString}
      navigateTo={navigateTo}
    />
  )}

  {page === "hub" && (
    <HubPage
      expenses={expenses}
      onAdjustDiaryContribution={(previousContribution, nextContribution) => {
        const now = new Date().toISOString();
        const nextEntries = applyHubDiaryContributionChange(
          entries,
          previousContribution,
          nextContribution,
          now
        );

        setEntries(nextEntries);
        recordAppChange({
          action: "update",
          title: "Đồng bộ thay đổi Hub vào nhật ký",
          description: "Hub đã điều chỉnh tiền, đơn hoặc giờ trong nhật ký.",
          date: nextContribution?.date ?? previousContribution?.date,
          patches: [
            createAppChangePatch({
              key: "entries",
              before: entries,
              after: nextEntries,
              beforeSummary: describeCollectionSnapshot("entries", entries),
              afterSummary: describeCollectionSnapshot("entries", nextEntries),
            }),
          ],
        });

        markLocalChanged("Đã đồng bộ tiền hub vào nhật ký, đang lưu cloud...");
      }}
      onMigrateLegacyDiaryIncome={(date, previousIncome, nextIncome) => {
        if (previousIncome === nextIncome) return;

        const now = new Date().toISOString();

        setEntries((prev) =>
          prev.map((entry) => {
            if (entry.date !== date || entry.income !== previousIncome) {
              return entry;
            }

            return {
              ...entry,
              income: nextIncome,
              updatedAt: now,
            };
          })
        );

        markLocalChanged("Đã sửa tiền hub cũ trong nhật ký, đang lưu cloud...");
      }}
      onSaveToDiary={(
        date,
        amount,
        diaryPayload: HubDiaryPayload
      ) => {
        const now = new Date().toISOString();
        const appendText = (current?: string, next?: string) => {
          return [current, next].filter(Boolean).join("\n");
        };
        const existing = entries.find((entry) => entry.date === date);
        const newEntry: DailyEntry = {
          id: existing?.id ?? crypto.randomUUID(),
          date,
          diary: appendText(existing?.diary, diaryPayload.diary),
          income: (existing?.income ?? 0) + amount,
          receivedMoney:
            (existing?.receivedMoney ?? 0) + diaryPayload.receivedMoney,
          bonusMoney: (existing?.bonusMoney ?? 0) + diaryPayload.bonusMoney,
          orderCount: (existing?.orderCount ?? 0) + diaryPayload.orderCount,
          workHours: roundWorkHours(
            (existing?.workHours ?? 0) + diaryPayload.workHours
          ),
          mood: diaryPayload.mood,
          note: appendText(existing?.note, diaryPayload.note),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        const nextEntries = [
          ...entries.filter((entry) => entry.date !== date),
          newEntry,
        ];

        setEntries(nextEntries);
        recordAppChange({
          action: existing ? "update" : "create",
          title: "Lưu ca Hub vào nhật ký",
          description: `Hub đã cộng tiền vào nhật ký ngày ${date}.`,
          date,
          patches: [
            createAppChangePatch({
              key: "entries",
              before: entries,
              after: nextEntries,
              beforeSummary: describeDailyEntry(existing),
              afterSummary: describeDailyEntry(newEntry),
            }),
          ],
        });

        markLocalChanged("Đã lưu ca hub vào nhật ký, đang lưu cloud...");
      }}
    />
  )}

  {page === "history" && (
    <HistoryPage
      historySearch={historySearch}
      setHistorySearch={updateHistorySearch}
      historyFromDate={historyFromDate}
      setHistoryFromDate={updateHistoryFromDate}
      historyToDate={historyToDate}
      setHistoryToDate={updateHistoryToDate}
      setHistoryQuickFilter={setHistoryQuickFilter}
      filteredEntries={filteredEntries}
      sortedEntries={sortedEntries}
      paginatedEntries={paginatedEntries}
      filteredEntriesTotalMoney={filteredEntriesTotalMoney}
      filteredEntriesHours={filteredEntriesHours}
      filteredEntriesOrders={filteredEntriesOrders}
      cloudLoadError={cloudLoadError}
      isCloudLoading={isCloudLoading}
      onRetry={() => void retryCloudLoad()}
      editEntry={editEntry}
      deleteEntry={deleteEntry}
      historyCurrentPage={historyCurrentPage}
      setHistoryCurrentPage={setHistoryCurrentPage}
      historyTotalPages={historyTotalPages}
      navigateTo={navigateTo}
    />
  )}
  {page === "balanceChecks" && (
    <BalanceChecksPage
      balanceChecks={sortedBalanceChecks}
      cloudLoadError={cloudLoadError}
      isCloudLoading={isCloudLoading}
      onRetry={() => void retryCloudLoad()}
      editBalanceCheck={editBalanceCheck}
      deleteBalanceCheck={deleteBalanceCheck}
      navigateTo={navigateTo}
    />
  )}
  {page === "expenses" && (
    <ExpensesPage
      expenseSearch={expenseSearch}
      setExpenseSearch={updateExpenseSearch}
      expenseFromDate={expenseFromDate}
      setExpenseFromDate={updateExpenseFromDate}
      expenseToDate={expenseToDate}
      setExpenseToDate={updateExpenseToDate}
      expenseLabelFilter={expenseLabelFilter}
      setExpenseLabelFilter={updateExpenseLabelFilter}
      expenseLabelOptions={expenseLabelOptions}
      expenseBudgetForm={expenseBudgetForm}
      setExpenseBudgetForm={setExpenseBudgetForm}
      editingExpenseBudgetId={editingExpenseBudgetId}
      expenseBudgets={goals.expenseBudgets ?? []}
      saveExpenseBudget={saveExpenseBudget}
      startEditExpenseBudget={startEditExpenseBudget}
      cancelEditExpenseBudget={cancelEditExpenseBudget}
      deleteExpenseBudget={deleteExpenseBudget}
      setExpenseQuickFilter={setExpenseQuickFilter}
      filteredExpenses={filteredExpenses}
      filteredExpensesTotal={filteredExpensesTotal}
      expenses={expenses}
      paginatedExpenses={paginatedExpenses}
      cloudLoadError={cloudLoadError}
      isCloudLoading={isCloudLoading}
      onRetry={() => void retryCloudLoad()}
      editExpense={editExpense}
      deleteExpense={deleteExpense}
      expenseCurrentPage={expenseCurrentPage}
      setExpenseCurrentPage={setExpenseCurrentPage}
      expenseTotalPages={expenseTotalPages}
      navigateTo={navigateTo}
    />
  )}
  {page === "changes" && (
    <AppChangeLogPage
      changeLogs={appChangeLogs}
      navigateTo={navigateTo}
      restoreChangeLog={restoreChangeLog}
    />
  )}
  <BalanceCheckOverlay
    appMoney={getAppMoneyAtDate(balanceCheckForm.date)}
    balanceCheck={balanceChecks.find((item) => item.date === balanceCheckForm.date)}
    form={balanceCheckForm}
    isOpen={balanceCheckOverlay.isOpen}
    isSubmitting={isBalanceCheckSubmitting}
    maxDate={todayString}
    mode={balanceCheckOverlay.mode}
    onBankChange={(value) => {
      balanceCheckDraftDirtyRef.current = true;
      setBalanceCheckForm((current) => ({ ...current, bank: value }));
    }}
    onCashChange={(value) => {
      balanceCheckDraftDirtyRef.current = true;
      setBalanceCheckForm((current) => ({ ...current, cash: value }));
    }}
    onDateChange={(nextDate) => {
      if (
        balanceCheckDraftDirtyRef.current &&
        !confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển ngày kiểm kê không?")
      ) {
        return;
      }

      balanceCheckDraftDirtyRef.current = false;
      setSelectedDate(nextDate);
      setBalanceCheckForm((current) => ({ ...current, date: nextDate }));
    }}
    onNoteChange={(value) => {
      balanceCheckDraftDirtyRef.current = true;
      setBalanceCheckForm((current) => ({ ...current, note: value }));
    }}
    onRequestClose={closeBalanceCheckOverlay}
    onStartEditing={() =>
      setBalanceCheckOverlay((current) => ({ ...current, mode: "edit" }))
    }
    onSubmit={handleBalanceCheckSubmit}
  />
    </MoneyPageShell>
  );
}
