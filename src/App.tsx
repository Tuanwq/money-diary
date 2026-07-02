import { BalanceCheckCard } from "./components/BalanceCheckCard";
import { AccountBar } from "./components/AccountBar";
import { exportWordReport } from "./features/report/exportWordReport";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useCloudSync } from "./hooks/useCloudSync";
import { useMoneyDiaryData } from "./hooks/useMoneyDiaryData";
import { AuthPage } from "./pages/AuthPage";
import { BalanceChecksPage } from "./pages/BalanceChecksPage";
import { CloseDayPage, type CloseDayForm } from "./pages/CloseDayPage";
import { EntryPage } from "./pages/EntryPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { GoalsPage } from "./pages/GoalsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS_PER_PAGE } from "./constants";
import {
  DEFAULT_HUB_SETTINGS,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "./constants/hanoiHub";
import { BottomNav } from "./components/BottomNav";
import {
  HubPage,
  type HubDiaryContribution,
  type HubDiaryPayload,
} from "./pages/HubPage";
import type { HubEntry, HubSettings } from "./types/hub";
import type {
  BalanceCheckEntry,
  BalanceSnapshot,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  GoalContribution,
  Goals,
  Mood,
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
  formatMoneyInput,
  parseMoneyInput,
} from "./utils/money";
import {
  buildDataWarnings,
  type DataWarning,
} from "./utils/dataWarnings";
import { buildGoalForecast } from "./utils/forecast";
import { calculateHubIncome } from "./utils/hubIncome";

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
    other: "",
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
  const [balanceCheckCurrentPage, setBalanceCheckCurrentPage] = useState(1);

  const [balanceCheckForm, setBalanceCheckForm] = useState({
    date: getToday(),
    cash: "",
    bank: "",
    note: "",
  });
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingExpenseDate, setEditingExpenseDate] = useState<string | null>(
  null
);
  const { page, goalScreen, setGoalScreen, navigateTo } = useAppNavigation();
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
    syncStatus,
    setSyncStatus,
    markLocalChanged,
    handleSignUp,
    handleLogin,
    handleLogout,
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
  const balanceCheckSectionRef = useRef<HTMLDivElement | null>(null);

  const [historySearch, setHistorySearch] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");

  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFromDate, setExpenseFromDate] = useState("");
  const [expenseToDate, setExpenseToDate] = useState("");

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
  other: "",
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

const filteredEntriesNormalMoney = filteredEntries.reduce(
  (sum, entry) => sum + getNormalIncome(entry),
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

const sortedBalanceChecks = [...balanceChecks].sort((a, b) =>
  b.date.localeCompare(a.date)
);

const balanceCheckTotalPages = Math.max(
  1,
  Math.ceil(sortedBalanceChecks.length / ITEMS_PER_PAGE)
);

const paginatedBalanceChecks = sortedBalanceChecks.slice(
  (balanceCheckCurrentPage - 1) * ITEMS_PER_PAGE,
  balanceCheckCurrentPage * ITEMS_PER_PAGE
);

const filteredExpenses = sortedExpenses.filter((expense) => {
  const keyword = expenseSearch.trim().toLowerCase();

  const matchKeyword =
    !keyword ||
    expense.date.toLowerCase().includes(keyword) ||
    expense.note.toLowerCase().includes(keyword);

  const matchDate = isDateInRange(
    expense.date,
    expenseFromDate,
    expenseToDate
  );

  return matchKeyword && matchDate;
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

function setHistoryQuickFilter(type: "today" | "7days" | "month" | "all") {
  setHistoryCurrentPage(1);

  if (type === "today") {
    setHistoryFromDate(getToday());
    setHistoryToDate(getToday());
  }

  if (type === "7days") {
    setHistoryFromDate(getDateDaysAgo(6));
    setHistoryToDate(getToday());
  }

  if (type === "month") {
    setHistoryFromDate(getMonthStart());
    setHistoryToDate(getToday());
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

function setExpenseQuickFilter(type: "today" | "7days" | "month" | "all") {
  setExpenseCurrentPage(1);

  if (type === "today") {
    setExpenseFromDate(getToday());
    setExpenseToDate(getToday());
  }

  if (type === "7days") {
    setExpenseFromDate(getDateDaysAgo(6));
    setExpenseToDate(getToday());
  }

  if (type === "month") {
    setExpenseFromDate(getMonthStart());
    setExpenseToDate(getToday());
  }

  if (type === "all") {
    setExpenseFromDate("");
    setExpenseToDate("");
    setExpenseSearch("");
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
  (goal) => goal.id === selectedCompletedGoalId
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
const todayChecklistDoneCount = [
  todayEntry,
  todayExpense,
  todayBalanceCheck,
].filter(Boolean).length;
const dataWarnings = useMemo(
  () =>
    buildDataWarnings({
      entries,
      expenses,
      balanceChecks,
      today: todayString,
    }),
  [entries, expenses, balanceChecks, todayString]
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
  const useTotalExpense =
    !expense || (expense.breakfast === 0 && expense.lunch === 0 && expense.dinner === 0);

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
    other:
      !useTotalExpense && expense
        ? formatMoneyInput(String(expense.other ?? 0))
        : "",
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
    const safeDate = warningDate > todayString ? todayString : warningDate;

    setSelectedDate(safeDate);
    setBalanceCheckForm((prev) => ({
      ...prev,
      date: safeDate,
    }));
    navigateTo("home", warning.actionGoalScreen ?? "menu");

    window.setTimeout(() => {
      balanceCheckSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return;
  }

  navigateTo(warning.actionPage, warning.actionGoalScreen ?? "menu");
}

function goToTodayBalanceCheck() {
  setSelectedDate(todayString);
  setBalanceCheckForm((prev) => ({
    ...prev,
    date: todayString,
  }));

  window.setTimeout(() => {
    balanceCheckSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 0);
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
  const other = parseMoneyInput(expenseForm.other);

  if (breakfast < 0 || lunch < 0 || dinner < 0 || other < 0) {
    alert("Chi tiêu không được âm.");
    return;
  }

  const now = new Date().toISOString();
  const savedDate = expenseForm.date;
  markLocalChanged("Đã sửa chi tiêu, đang lưu cloud...");

  setExpenses((prev) => {
    const existingExpense = prev.find(
      (expense) => expense.date === expenseForm.date
    );

    const newExpense: ExpenseEntry = {
      id: existingExpense?.id ?? crypto.randomUUID(),
      date: expenseForm.date,
      breakfast,
      lunch,
      dinner,
      other,
      note: expenseForm.note,
      createdAt: existingExpense?.createdAt ?? now,
      updatedAt: now,
    };

    const withoutSameDate = prev.filter(
      (expense) => expense.date !== expenseForm.date
    );

    return [...withoutSameDate, newExpense];
  });

  setSelectedDate(savedDate);
  setEditingExpenseDate(null);

  setExpenseForm({
    date: getToday(),
    breakfast: "",
    lunch: "",
    dinner: "",
    other: "",
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
  const other =
    closeDayForm.expenseMode === "meals"
      ? parseMoneyInput(closeDayForm.other)
      : parseMoneyInput(closeDayForm.expenseTotal);
  const expenseTotal = breakfast + lunch + dinner + other;
  const note = closeDayForm.note.trim();

  if (!income && !bonusMoney && !receivedMoney && !expenseTotal && !note) {
    alert("Bạn chưa nhập dữ liệu nào để chốt ngày.");
    return;
  }

  const now = new Date().toISOString();
  const savedDate = closeDayForm.date;

  markLocalChanged("Đã chốt ngày, đang lưu cloud...");

  setEntries((prev) => {
    const existingEntry = prev.find((entry) => entry.date === savedDate);

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

    return [
      ...prev.filter((entry) => entry.date !== savedDate),
      newEntry,
    ];
  });

  setExpenses((prev) => {
    const existingExpense = prev.find((expense) => expense.date === savedDate);

    const newExpense: ExpenseEntry = {
      id: existingExpense?.id ?? crypto.randomUUID(),
      date: savedDate,
      breakfast,
      lunch,
      dinner,
      other,
      note: note || existingExpense?.note || "",
      createdAt: existingExpense?.createdAt ?? now,
      updatedAt: now,
    };

    return [
      ...prev.filter((expense) => expense.date !== savedDate),
      newExpense,
    ];
  });

  setSelectedDate(savedDate);
  setEditingDate(null);
  setEditingExpenseDate(null);
  setCloseDayForm(createCloseDayForm(getToday()));
  setSyncStatus("Đã chốt ngày");
  navigateTo("home", "menu");
}

function handleBalanceCheckSubmit(event: React.FormEvent) {
  event.preventDefault();

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

  const appMoney = getAppMoneyAtDate(balanceCheckForm.date);
  const actualMoney = cash + bank;
  const difference = actualMoney - appMoney;
  const now = new Date().toISOString();

  markLocalChanged("Đã lưu kiểm kê số dư, đang lưu cloud...");
  balanceCheckDraftDirtyRef.current = false;

  setBalanceChecks((prev) => {
    const existing = prev.find((item) => item.date === balanceCheckForm.date);

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

    const withoutSameDate = prev.filter(
      (item) => item.date !== balanceCheckForm.date
    );

    return [...withoutSameDate, newCheck];
  });

  setSyncStatus("Đã lưu kiểm kê số dư");
  alert("Đã thêm kiểm kê thành công.");
}

function deleteBalanceCheck(id: string) {
  const confirmed = confirm("Bạn có chắc muốn xóa kiểm kê số dư này không?");
  if (!confirmed) return;

  markLocalChanged("Đã xóa kiểm kê số dư, đang lưu cloud...");

  setBalanceChecks((prev) => prev.filter((item) => item.id !== id));
}

function editBalanceCheck(item: BalanceCheckEntry) {
  setSelectedDate(item.date);

  setBalanceCheckForm({
    date: item.date,
    cash: formatMoneyInput(String(item.cash ?? 0)),
    bank: formatMoneyInput(String(item.bank ?? 0)),
    note: item.note ?? "",
  });

  navigateTo("home", "menu");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
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

    markLocalChanged("Đã sửa nhật ký, đang lưu cloud...");

    setEntries((prev) => {
      const existingEntry = prev.find((entry) => entry.date === form.date);

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

      const withoutSameDate = prev.filter((entry) => entry.date !== form.date);
      return [...withoutSameDate, newEntry];
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
    other: formatMoneyInput(String(expense.other ?? 0)),
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
  const confirmed = confirm("Bạn có chắc muốn xóa chi tiêu này không?");
  if (!confirmed) return;

  markLocalChanged("Đã xóa chi tiêu, đang lưu cloud...");

  setExpenses((prev) => prev.filter((expense) => expense.id !== id));
}

function deleteEntry(id: string) {
  const confirmed = confirm("Bạn có chắc muốn xóa nhật ký này không?");
  if (!confirmed) return;

  markLocalChanged("Đã xóa nhật ký, đang lưu cloud...");

  setEntries((prev) => prev.filter((entry) => entry.id !== id));
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

  setCompletedGoals((prev) => [completedGoal, ...prev]);

  setEntries([]);
  setExpenses([]);
  setBalanceChecks([]);

  setGoals((prev) => ({
    ...prev,
    bigGoalName: "Mục tiêu mới",
    bigGoalTarget: 0,
    bigGoalSaved: 0,
    bigGoalDeadline: getToday(),
    bigGoalStartDate: getToday(),
  }));

  setSelectedDate(getToday());
  setEditingDate(null);

  navigateTo("goals", "completed");
}

function addSubGoal() {
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
    return;
  }

  const now = new Date().toISOString();

  const newSubGoal: SubGoal = {
    id: crypto.randomUUID(),
    name,
    target,
    saved,
    deadline: subGoalForm.deadline,
    startDate: subGoalForm.startDate,
    contributions: [],
    createdAt: now,
    updatedAt: now,
  };

  markLocalChanged("Đã thêm mục tiêu phụ, đang lưu cloud...");

  setGoals((prev) => ({
    ...prev,
    subGoals: [...(prev.subGoals ?? []), newSubGoal],
  }));

  setSubGoalForm({
    name: "",
    target: "",
    saved: "",
    deadline: getToday(),
    startDate: getToday(),
  });
}

function deleteSubGoal(id: string) {
  const confirmed = confirm("Bạn có chắc muốn xóa mục tiêu phụ này không?");
  if (!confirmed) return;

  markLocalChanged("Đã xóa mục tiêu phụ, đang lưu cloud...");

  setGoals((prev) => ({
    ...prev,
    subGoals: (prev.subGoals ?? []).filter((goal) => goal.id !== id),
  }));
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

  markLocalChanged("Đã góp tiền vào mục tiêu phụ, đang lưu cloud...");

  setGoals((prev) => ({
    ...prev,
    subGoals: (prev.subGoals ?? []).map((goal) => {
      if (goal.id !== goalId) return goal;

      return {
        ...goal,
        contributions: [...goal.contributions, contribution],
        updatedAt: now,
      };
    }),
  }));

  setSubGoalContributionForms((prev) => ({
    ...prev,
    [goalId]: {
      amount: "",
      note: "",
    },
  }));
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

  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud..."); 

  setCompletedGoals((prev) => [completedGoal, ...prev]);

  setGoals((prev) => ({
    ...prev,
    subGoals: (prev.subGoals ?? []).filter((item) => item.id !== goalId),
  }));

  navigateTo("goals", "completed");
}

function deleteCompletedGoal(id: string) {
  const confirmed = confirm(
    "Bạn có chắc muốn xóa mục tiêu đã hoàn thành này không?"
  );

  if (!confirmed) return;

  markLocalChanged("Đã xóa mục tiêu hoàn thành, đang lưu cloud...");

  setCompletedGoals((prev) => prev.filter((goal) => goal.id !== id));
}

function updateGoal(key: keyof Goals, value: string) {
  const textFields: Array<keyof Goals> = [
    "bigGoalName",
    "bigGoalDeadline",
    "bigGoalStartDate",
  ];

  markLocalChanged("Đã cập nhật mục tiêu, đang lưu cloud...");

  setGoals((prev) => ({
    ...prev,
    [key]: textFields.includes(key) ? value : Number(value),
  }));
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

  markLocalChanged("Đã lưu mục tiêu lớn, đang lưu cloud...");

  setGoals((prev) => ({
    ...prev,
    bigGoalName: name,
    bigGoalTarget: target,
    bigGoalSaved: saved,
    bigGoalStartDate: mainGoalForm.bigGoalStartDate,
    bigGoalDeadline: mainGoalForm.bigGoalDeadline,
  }));

  alert("Đã lưu mục tiêu lớn.");
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

function renderBalanceCheckCard(title = "Kiểm kê số dư hôm nay") {
  return (
    <BalanceCheckCard
      title={title}
      form={balanceCheckForm}
      maxDate={todayString}
      appMoney={getAppMoneyAtDate(balanceCheckForm.date)}
      onSubmit={handleBalanceCheckSubmit}
      onDateChange={(nextDate) => {
        balanceCheckDraftDirtyRef.current = false;

        setSelectedDate(nextDate);
        setBalanceCheckForm((prev) => ({
          ...prev,
          date: nextDate,
        }));
      }}
      onCashChange={(value) => {
        balanceCheckDraftDirtyRef.current = true;

        setBalanceCheckForm((prev) => ({
          ...prev,
          cash: value,
        }));
      }}
      onBankChange={(value) => {
        balanceCheckDraftDirtyRef.current = true;

        setBalanceCheckForm((prev) => ({
          ...prev,
          bank: value,
        }));
      }}
      onNoteChange={(value) => {
        balanceCheckDraftDirtyRef.current = true;

        setBalanceCheckForm((prev) => ({
          ...prev,
          note: value,
        }));
      }}
    />
  );
}

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-3xl font-bold">Nhật ký kiếm tiền</h1>
          <p className="mt-1 text-slate-500">
            Ghi lại mỗi ngày, theo dõi tiền kiếm được, giờ làm và tiến độ mục tiêu.
          </p>
        </div>
      </header>

      {!session && (
        <AuthPage
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          authPassword={authPassword}
          setAuthPassword={setAuthPassword}
          handleLogin={handleLogin}
          handleSignUp={handleSignUp}
        />
      )}

      {session && (
        <>
        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-28">
          <AccountBar
            email={session.user.email}
            syncStatus={syncStatus}
            onExportWord={exportToWord}
            onLogout={handleLogout}
          />

          {page === "home" && (
            <HomePage
              isSelectedToday={isSelectedToday}
              selectedDate={selectedDate}
              goals={goals}
              isBigGoalBehind={isBigGoalBehind}
              daysLeft={daysLeft}
              goToPreviousDay={goToPreviousDay}
              goToNextDay={goToNextDay}
              goToToday={goToToday}
              handleSelectDate={handleSelectDate}
              todayString={todayString}
              todayChecklistDoneCount={todayChecklistDoneCount}
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
              openCloseDay={() => openCloseDay()}
              onDataWarningAction={handleDataWarningAction}
              selectedActualIncome={selectedActualIncome}
              selectedMainIncome={selectedMainIncome}
              selectedBonusMoney={selectedBonusMoney}
              selectedExpenseTotal={selectedExpenseTotal}
              selectedReceivedMoney={selectedReceivedMoney}
              selectedHours={selectedHours}
              weekIncome={weekIncome}
              monthIncome={monthIncome}
              actualMoney={actualMoney}
              totalJourneyMoney={totalJourneyMoney}
              balanceCheckSectionRef={balanceCheckSectionRef}
              renderBalanceCheckCard={renderBalanceCheckCard}
              navigateTo={navigateTo}
            />
          )}
          {page === "goals" && (
            <GoalsPage
              addContributionToSubGoal={addContributionToSubGoal}
              addSubGoal={addSubGoal}
              balanceChartDays={balanceChartDays}
              balanceChartTitle={balanceChartTitle}
              bigGoalProgress={bigGoalProgress}
              bigGoalTimeProgress={bigGoalTimeProgress}
              chartData={chartData}
              chartDays={chartDays}
              completeCurrentGoal={completeCurrentGoal}
              completedGoals={completedGoals}
              completeSubGoal={completeSubGoal}
              currentBalanceMovementData={currentBalanceMovementData}
              currentGoalStartDate={currentGoalStartDate}
              daysLeft={daysLeft}
              deleteCompletedGoal={deleteCompletedGoal}
              deleteSubGoal={deleteSubGoal}
              forecastDays={forecastDays}
              form={form}
              goalForecast={goalForecast}
              goals={goals}
              goalScreen={goalScreen}
              incomePerHour={incomePerHour}
              isBigGoalBehind={isBigGoalBehind}
              mainGoalForm={mainGoalForm}
              navigateTo={navigateTo}
              needPerDay={needPerDay}
              remainingBigGoal={remainingBigGoal}
              safeChartDays={safeChartDays}
              safeForecastDays={safeForecastDays}
              saveMainGoal={saveMainGoal}
              selectedCompletedGoal={selectedCompletedGoal}
              setBalanceChartDays={setBalanceChartDays}
              setChartDays={setChartDays}
              setForecastDays={setForecastDays}
              setForm={setForm}
              setGoalScreen={setGoalScreen}
              setMainGoalForm={setMainGoalForm}
              setSelectedCompletedGoalId={setSelectedCompletedGoalId}
              setSubGoalContributionForms={setSubGoalContributionForms}
              setSubGoalForm={setSubGoalForm}
              subGoalContributionForms={subGoalContributionForms}
              subGoalForm={subGoalForm}
              todayString={todayString}
              totalSavedForBigGoal={totalSavedForBigGoal}
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
      renderBalanceCheckCard={renderBalanceCheckCard}
      navigateTo={navigateTo}
    />
  )}

  {page === "hub" && (
    <HubPage
      onAdjustDiaryContribution={(previousContribution, nextContribution) => {
        const now = new Date().toISOString();

        setEntries((prev) =>
          applyHubDiaryContributionChange(
            prev,
            previousContribution,
            nextContribution,
            now
          )
        );

        markLocalChanged("Đã đồng bộ tiền hub vào nhật ký, đang lưu cloud...");
      }}
      onBackHome={() => navigateTo("home", "menu")}
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

        setEntries((prev) => {
          const existing = prev.find((entry) => entry.date === date);

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

          return [...prev.filter((entry) => entry.date !== date), newEntry];
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
      filteredEntriesNormalMoney={filteredEntriesNormalMoney}
      filteredEntriesHours={filteredEntriesHours}
      filteredEntriesOrders={filteredEntriesOrders}
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
      paginatedBalanceChecks={paginatedBalanceChecks}
      balanceCheckCurrentPage={balanceCheckCurrentPage}
      balanceCheckTotalPages={balanceCheckTotalPages}
      setBalanceCheckCurrentPage={setBalanceCheckCurrentPage}
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
      setExpenseQuickFilter={setExpenseQuickFilter}
      filteredExpenses={filteredExpenses}
      filteredExpensesTotal={filteredExpensesTotal}
      expenses={expenses}
      paginatedExpenses={paginatedExpenses}
      editExpense={editExpense}
      deleteExpense={deleteExpense}
      expenseCurrentPage={expenseCurrentPage}
      setExpenseCurrentPage={setExpenseCurrentPage}
      expenseTotalPages={expenseTotalPages}
      navigateTo={navigateTo}
    />
  )}</main>

    <BottomNav
      navigateTo={navigateTo}
      openCloseDay={() => openCloseDay()}
    />
  </>
)}
    </div>
  );
}
