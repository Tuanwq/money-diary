import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Mood = "good" | "normal" | "tired" | "bad";

type DailyEntry = {
  id: string;
  date: string;
  diary: string;
  income: number;
  receivedMoney: number;
  bonusMoney: number;
  orderCount: number;
  workHours: number;
  mood: Mood;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

type ExpenseEntry = {
  id: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  other: number;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

type Goals = {
  dailyIncome: number;
  dailyHours: number;
  weeklyIncome: number;
  weeklyHours: number;
  monthlyIncome: number;
  monthlyHours: number;

  bigGoalName: string;
  bigGoalTarget: number;
  bigGoalSaved: number;
  bigGoalDeadline: string;
  bigGoalStartDate: string;

  subGoals: SubGoal[];
};

type Page = "home" | "goals" | "entry" | "history" | "expenses";
type GoalScreen =
  | "menu"
  | "current"
  | "balance"
  | "completed"
  | "completedDetail";
type AppHistoryState = {
  page: Page;
  goalScreen: GoalScreen;
};

type CompletedGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  completedAt: string;
  startDate?: string;

  goalType?: "main" | "sub";

  totalIncome?: number;
  totalExpense?: number;
  actualMoney?: number;
  totalJourneyMoney?: number;
  totalHours?: number;
  totalOrders?: number;

  entriesSnapshot?: DailyEntry[];
  expensesSnapshot?: ExpenseEntry[];
  balanceSnapshots?: BalanceSnapshot[];

  contributionsSnapshot?: GoalContribution[];
  goalProgressSnapshots?: GoalProgressSnapshot[];
};

type BalanceSnapshot = {
  date: string;
  totalMoney: number;
  actualMoney: number;
  income: number;
  expense: number;
};

type GoalContribution = {
  id: string;
  date: string;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt?: string;
};

type SubGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  startDate: string;
  contributions: GoalContribution[];
  createdAt: string;
  updatedAt?: string;
};

type GoalProgressSnapshot = {
  date: string;
  saved: number;
  contributed: number;
  progress: number;
};

const STORAGE_ENTRIES_KEY = "money_diary_entries";
const STORAGE_GOALS_KEY = "money_diary_goals";
const STORAGE_COMPLETED_GOALS_KEY = "money_diary_completed_goals";
const STORAGE_EXPENSES_KEY = "money_diary_expenses";

const ITEMS_PER_PAGE = 7;

const defaultGoals: Goals = {
  dailyIncome: 200000,
  dailyHours: 4,
  weeklyIncome: 1500000,
  weeklyHours: 20,
  monthlyIncome: 0,
  monthlyHours: 0,

  bigGoalName: "Your Goals",
  bigGoalTarget: 40000000,
  bigGoalSaved: 10000000,
  bigGoalDeadline: "2026-08-16",
  bigGoalStartDate: getToday(),

  subGoals: [],
};

const moodLabels: Record<Mood, string> = {
  good: "Vui",
  normal: "Bình thường",
  tired: "Mệt",
  bad: "Như l",
};

function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  return getDateString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function parseMoneyInput(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

function formatMoneyInput(value: string) {
  const onlyDigits = value.replace(/[^\d]/g, "");

  if (!onlyDigits) return "";

  return new Intl.NumberFormat("vi-VN").format(Number(onlyDigits));
}

function getProgress(current: number, target: number) {
  if (target <= 0) return 0;

  const progress = Math.round((current / target) * 100);

  return Math.min(Math.max(progress, 0), 100);
}

function toDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

function isSameMonth(dateString: string, now = new Date()) {
  const date = toDate(dateString);
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(dateString: string, now = new Date()) {
  const date = toDate(dateString);

  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDay + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return date >= monday && date <= sunday;
}

function formatDateShort(dateString: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(toDate(dateString));
}

function getDaysLeft(deadline: string) {
  if (!deadline) return 0;

  const today = toDate(getToday());
  const targetDate = toDate(deadline);
  const diffTime = targetDate.getTime() - today.getTime();

  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  target,
  progress,
}: {
  title: string;
  value: string;
  target: string;
  progress: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs text-slate-500 sm:text-sm">{title}</p>

      <h2 className="mt-2 break-words text-xl font-bold text-slate-900 sm:text-2xl">
        {value}
      </h2>

      <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
        Mục tiêu: {target}
      </p>

      <ProgressBar value={progress} />

      <p className="mt-2 text-xs font-medium sm:text-sm">{progress}%</p>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(defaultGoals);
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingExpenseDate, setEditingExpenseDate] = useState<string | null>(
  null
);
  const [page, setPage] = useState<Page>("home");
  const [goalScreen, setGoalScreen] = useState<GoalScreen>("menu");
  const [chartDays, setChartDays] = useState(7);
  const [balanceChartDays, setBalanceChartDays] = useState<"all" | number>(
  "all"
);
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Chưa đồng bộ");
  const localDirtyRef = useRef(false);

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
  const initialState: AppHistoryState = {
    page: "home",
    goalScreen: "menu",
  };

  window.history.replaceState(initialState, "", window.location.href);

  function handleBrowserBack(event: PopStateEvent) {
    const state = event.state as AppHistoryState | null;

    if (state?.page) {
      setPage(state.page);
      setGoalScreen(state.goalScreen ?? "menu");
      return;
    }

    setPage("home");
    setGoalScreen("menu");
  }

  window.addEventListener("popstate", handleBrowserBack);

  return () => {
    window.removeEventListener("popstate", handleBrowserBack);
  };
}, []);

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

useEffect(() => {
  setHistoryCurrentPage(1);
}, [historySearch, historyFromDate, historyToDate]);

useEffect(() => {
  setExpenseCurrentPage(1);
}, [expenseSearch, expenseFromDate, expenseToDate]);

  useEffect(() => {
    const savedEntries = localStorage.getItem(STORAGE_ENTRIES_KEY);
    const savedGoals = localStorage.getItem(STORAGE_GOALS_KEY);
    const savedCompletedGoals = localStorage.getItem(STORAGE_COMPLETED_GOALS_KEY);
    const savedExpenses = localStorage.getItem(STORAGE_EXPENSES_KEY);

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }

    if (savedGoals) {
      setGoals({
        ...defaultGoals,
        ...JSON.parse(savedGoals),
      });
    }

    if (savedCompletedGoals) {
      setCompletedGoals(JSON.parse(savedCompletedGoals));
    }

    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
}

    setLoaded(true);
  }, []);

useEffect(() => {
  if (!loaded) return;

  localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
  localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
  localStorage.setItem(STORAGE_GOALS_KEY, JSON.stringify(goals));
  localStorage.setItem(
    STORAGE_COMPLETED_GOALS_KEY,
    JSON.stringify(completedGoals)
  );
}, [entries, expenses, goals, completedGoals, loaded]);

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!session?.user) return;

  setCloudLoaded(false);
  loadCloudData(session.user.id);
}, [session?.user.id]);

useEffect(() => {
  if (!session?.user || !cloudLoaded) return;

  const timeout = setTimeout(async () => {
    setSyncStatus("Đang lưu...");

    const { error } = await supabase.from("money_diary_state").upsert({
      user_id: session.user.id,
      entries,
      expenses,
      goals,
      completed_goals: completedGoals,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      setSyncStatus("Lỗi lưu cloud");
      return;
    }

    localDirtyRef.current = false;
    setSyncStatus("Đã đồng bộ");
  }, 700);

  return () => clearTimeout(timeout);
}, [entries, expenses, goals, completedGoals, session?.user.id, cloudLoaded]);

useEffect(() => {
  if (!session?.user) return;

  let refreshing = false;

  async function refreshWhenBackToApp() {
    if (!session?.user || refreshing) return;

    // Nếu vừa sửa dữ liệu local mà chưa kịp lưu cloud,
    // không kéo cloud cũ về ghi đè.
    if (localDirtyRef.current) return;

    refreshing = true;
    setCloudLoaded(false);
    await loadCloudData(session.user.id);
    refreshing = false;
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      refreshWhenBackToApp();
    }
  }

  window.addEventListener("focus", refreshWhenBackToApp);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", refreshWhenBackToApp);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [session?.user.id]);

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

function isDateInRange(date: string, fromDate: string, toDate: string) {
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function getMonthStart() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function setHistoryQuickFilter(type: "today" | "7days" | "month" | "all") {
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

function setExpenseQuickFilter(type: "today" | "7days" | "month" | "all") {
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

function getMainIncome(entry: DailyEntry) {
  return entry.income ?? 0;
}

function getReceivedMoney(entry: DailyEntry) {
  return entry.receivedMoney ?? 0;
}

function getBonusMoney(entry: DailyEntry) {
  return entry.bonusMoney ?? 0;
}

// Thu nhập tính bình thường: dùng cho tiền thực tế hôm nay và biểu đồ
function getNormalIncome(entry: DailyEntry) {
  return getMainIncome(entry) + getBonusMoney(entry);
}

// Tổng tiền thực sự nhận được: dùng cho tuần, tháng, tổng hành trình, tiền hiện có
function getTotalEntryMoney(entry: DailyEntry) {
  return getMainIncome(entry) + getBonusMoney(entry) + getReceivedMoney(entry);
}

type SyncableDatedItem = {
  date: string;
  createdAt?: string;
  updatedAt?: string;
};

function getSyncTime(item: SyncableDatedItem) {
  return new Date(
    item.updatedAt ?? item.createdAt ?? "1970-01-01T00:00:00.000Z"
  ).getTime();
}

function mergeByNewestDate<T extends SyncableDatedItem>(
  cloudItems: T[],
  localItems: T[]
) {
  const map = new Map<string, T>();

  [...localItems, ...cloudItems].forEach((item) => {
    const current = map.get(item.date);

    if (!current || getSyncTime(item) >= getSyncTime(current)) {
      map.set(item.date, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function getExpenseTotal(expense: ExpenseEntry) {
  return expense.breakfast + expense.lunch + expense.dinner + expense.other;
}

function getSubGoalSaved(goal: SubGoal) {
  const contributed = goal.contributions.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return goal.saved + contributed;
}

function getDailyNeedForGoal(target: number, currentSaved: number, deadline: string) {
  const remaining = Math.max(target - currentSaved, 0);
  const days = getDaysLeft(deadline);

  if (days <= 0) return remaining;

  return Math.ceil(remaining / days);
}

function getGoalTimeProgress(startDate: string, deadline: string) {
  const start = toDate(startDate);
  const end = toDate(deadline);
  const today = toDate(getToday());

  const totalDays = Math.max(
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );

  const elapsedDays = Math.min(
    Math.max(
      Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      0
    ),
    totalDays
  );

  return Math.round((elapsedDays / totalDays) * 100);
}

function isGoalBehind(goal: SubGoal) {
  const moneyProgress = getProgress(getSubGoalSaved(goal), goal.target);
  const timeProgress = getGoalTimeProgress(goal.startDate, goal.deadline);

  return moneyProgress + 5 < timeProgress;
}

function buildSubGoalProgressData(goal: SubGoal): GoalProgressSnapshot[] {
  const result: GoalProgressSnapshot[] = [];

  const currentDate = toDate(goal.startDate);
  const lastDate = toDate(getToday());

  let runningSaved = goal.saved;

  while (currentDate <= lastDate) {
    const dateString = getDateString(currentDate);

    const dayContributed = goal.contributions
      .filter((item) => item.date === dateString)
      .reduce((sum, item) => sum + item.amount, 0);

    runningSaved += dayContributed;

    result.push({
      date: dateString,
      saved: runningSaved,
      contributed: dayContributed,
      progress: getProgress(runningSaved, goal.target),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
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

  function navigateTo(nextPage: Page, nextGoalScreen: GoalScreen = "menu") {
  const nextState: AppHistoryState = {
    page: nextPage,
    goalScreen: nextGoalScreen,
  };

  window.history.pushState(nextState, "", window.location.href);

  setPage(nextPage);
  setGoalScreen(nextGoalScreen);
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

function markLocalChanged(message = "Có thay đổi, đang chờ đồng bộ...") {
  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud...");
  setSyncStatus(message);
}

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const income = parseMoneyInput(form.income);
    const receivedMoney = parseMoneyInput(form.receivedMoney);
    const bonusMoney = parseMoneyInput(form.bonusMoney);
    const orderCount = Number(form.orderCount);
    const workHours = Number(form.workHours);

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
    workHours: String(entry.workHours ?? 0),
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
  };

  setCompletedGoals((prev) => [completedGoal, ...prev]);

  setEntries([]);
  setExpenses([]);

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

  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud...");

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

  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud...");

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

async function loadCloudData(userId: string) {
  setSyncStatus("Đang tải và gộp dữ liệu...");

  const { data, error } = await supabase
    .from("money_diary_state")
    .select("entries, goals, completed_goals, expenses")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    setSyncStatus("Lỗi tải dữ liệu cloud");
    return;
  }

  const localEntries = entries;
  const localGoals = goals;
  const localCompletedGoals = completedGoals;

  const cloudExpenses = data?.expenses
    ? ((data.expenses || []) as unknown as ExpenseEntry[])
    : [];

  const cloudEntries = data?.entries
    ? ((data.entries || []) as unknown as DailyEntry[])
    : [];

  const cloudGoals = data?.goals
    ? ({
        ...defaultGoals,
        ...((data.goals || {}) as unknown as Goals),
      } as Goals)
    : null;

  const cloudCompletedGoals = data?.completed_goals
    ? ((data.completed_goals || []) as unknown as CompletedGoal[])
    : [];

  const mergedExpenses = mergeByNewestDate(cloudExpenses, expenses);

  setExpenses(mergedExpenses);

  const mergedEntries = mergeByNewestDate(cloudEntries, localEntries);

  const mergedCompletedGoalsMap = new Map<string, CompletedGoal>();

  cloudCompletedGoals.forEach((goal) => {
    mergedCompletedGoalsMap.set(goal.id, goal);
  });

  localCompletedGoals.forEach((goal) => {
    mergedCompletedGoalsMap.set(goal.id, goal);
  });

  const mergedCompletedGoals = Array.from(mergedCompletedGoalsMap.values());

  const mergedGoals = cloudGoals ?? localGoals;

  setEntries(mergedEntries);
  setGoals(mergedGoals);
  setCompletedGoals(mergedCompletedGoals);

  const { error: upsertError } = await supabase.from("money_diary_state").upsert({
    user_id: userId,
    entries: mergedEntries,
    goals: mergedGoals,
    completed_goals: mergedCompletedGoals,
    expenses: mergedExpenses,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    console.error(upsertError);
    setSyncStatus("Lỗi đẩy dữ liệu local lên cloud");
    return;
  }

  setCloudLoaded(true);
  setSyncStatus("Đã đồng bộ");
}

function updateGoal(key: keyof Goals, value: string) {
  const textFields: Array<keyof Goals> = [
    "bigGoalName",
    "bigGoalDeadline",
    "bigGoalStartDate",
  ];

  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud...");

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

  markLocalChanged("Đã hoàn thành mục tiêu phụ, đang lưu cloud...");

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

async function handleSignUp() {
  const email = authEmail.trim();
  const password = authPassword.trim();

  if (!email || !password) {
    alert("Bạn chưa nhập email hoặc mật khẩu.");
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert(
    "Đăng ký thành công. Nếu Supabase yêu cầu xác nhận email, hãy mở email để xác nhận."
  );
}

async function handleLogin() {
  const email = authEmail.trim();
  const password = authPassword.trim();

  if (!email || !password) {
    alert("Bạn chưa nhập email hoặc mật khẩu.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }
}

async function handleLogout() {
  await supabase.auth.signOut();

  setSession(null);
  setCloudLoaded(false);
  setSyncStatus("Chưa đồng bộ");
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
  <main className="mx-auto max-w-md px-4 py-8">
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold">Đăng nhập để đồng bộ</h2>

      <p className="mt-2 text-sm text-slate-500">
        Dùng cùng một tài khoản trên laptop và điện thoại để dữ liệu tự đồng bộ.
      </p>

      <form
        className="mt-5 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Mật khẩu</label>
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Ít nhất 6 ký tự"
            autoComplete="current-password"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
          >
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            className="rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
          >
            Đăng ký
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-500">
        Sau khi đăng nhập, dữ liệu nhật ký và mục tiêu sẽ được lưu lên cloud.
      </p>
    </section>
  </main>
)}

{session && (
  <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
  <div>
    <p className="text-sm text-slate-500">Tài khoản</p>
    <p className="font-bold">{session.user.email}</p>
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
      {syncStatus}
    </span>

    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
    >
      Đăng xuất
    </button>
  </div>
</section>
  {page === "home" && (
    <>
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {isSelectedToday ? "Mục tiêu hôm nay" : "Mục tiêu ngày đang xem"}
            </h2>

            <p className="text-sm text-slate-500">
              Ngày:{" "}
              <strong>
                {isSelectedToday ? "Hôm nay" : formatDateShort(selectedDate)}
              </strong>
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div
                title={`Mục tiêu chính: ${goals.bigGoalName}`}
                className={`rounded-2xl px-4 py-3 ${
                  isBigGoalBehind ? "bg-red-50" : "bg-slate-900 text-white"
                }`}
              >
                <p
                  className={`text-xs ${
                    isBigGoalBehind ? "text-red-600" : "text-slate-200"
                  }`}
                >
                  Mục tiêu chính
                </p>

                <div className="flex items-end gap-1">
                  <span
                    className={`text-3xl font-black ${
                      isBigGoalBehind ? "text-red-600" : "text-white"
                    }`}
                  >
                    {daysLeft}
                  </span>
                  <span
                    className={`pb-1 text-sm font-medium ${
                      isBigGoalBehind ? "text-red-600" : "text-slate-200"
                    }`}
                  >
                    ngày
                  </span>
                </div>
              </div>

              {(goals.subGoals ?? []).map((goal) => {
                const subDaysLeft = getDaysLeft(goal.deadline);
                const behind = isGoalBehind(goal);

                return (
                  <div
                    key={goal.id}
                    title={`${goal.name} · còn ${subDaysLeft} ngày`}
                    className={`rounded-xl px-3 py-2 ${
                      behind ? "bg-red-50" : "bg-white"
                    } shadow-sm`}
                  >
                    <p
                      className={`text-xs ${
                        behind ? "text-red-600" : "text-slate-500"
                      }`}
                    >
                      Phụ
                    </p>

                    <p
                      className={`text-lg font-black ${
                        behind ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {subDaysLeft}
                      <span className="ml-1 text-xs font-medium">ngày</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousDay}
              className="rounded-xl border bg-white px-4 py-2 text-lg font-bold shadow-sm hover:bg-slate-100"
            >
              {"<"}
            </button>

            <button
              type="button"
              onClick={goToNextDay}
              disabled={isSelectedToday}
              className={`rounded-xl border bg-white px-4 py-2 text-lg font-bold shadow-sm ${
                isSelectedToday
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              {">"}
            </button>

            <button
              type="button"
              onClick={goToToday}
              disabled={isSelectedToday}
              className={`rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm ${
                isSelectedToday
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              Hôm nay
            </button>

            <input
              type="date"
              value={selectedDate}
              max={todayString}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="rounded-xl border bg-white px-4 py-2 text-sm shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            title={isSelectedToday ? "Tiền thực tế hôm nay" : "Tiền thực tế ngày này"}
            value={formatMoney(selectedActualIncome)}
            target={`Làm: ${formatMoney(selectedMainIncome)} + Thưởng: ${formatMoney(
              selectedBonusMoney
            )} - Chi: ${formatMoney(selectedExpenseTotal)} | Nhận: ${formatMoney(
              selectedReceivedMoney
            )}`}
            progress={getProgress(selectedActualIncome, goals.dailyIncome)}
          />

          <StatCard
            title={isSelectedToday ? "Giờ làm hôm nay" : "Giờ làm ngày này"}
            value={`${selectedHours} giờ`}
            target={`${goals.dailyHours} giờ`}
            progress={getProgress(selectedHours, goals.dailyHours)}
          />

          <StatCard
            title={isSelectedToday ? "Tiền tuần này" : "Tiền tuần đang xem"}
            value={formatMoney(weekIncome)}
            target={formatMoney(goals.weeklyIncome)}
            progress={getProgress(weekIncome, goals.weeklyIncome)}
          />

          <StatCard
            title={isSelectedToday ? "Tiền tháng này" : "Tiền tháng đang xem"}
            value={formatMoney(monthIncome)}
            target={formatMoney(goals.monthlyIncome)}
            progress={getProgress(monthIncome, goals.monthlyIncome)}
          />
          <StatCard
            title="Tiền thực tế hiện có"
            value={formatMoney(actualMoney)}
            target={formatMoney(goals.bigGoalTarget)}
            progress={getProgress(actualMoney, goals.bigGoalTarget)}
          />

          <StatCard
            title="Tổng tiền hành trình"
            value={formatMoney(totalJourneyMoney)}
            target={formatMoney(goals.bigGoalTarget)}
            progress={getProgress(totalJourneyMoney, goals.bigGoalTarget)}
          />      
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => navigateTo("goals", "menu")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">🎯</p>
          <h3 className="mt-3 text-xl font-bold">Các mục tiêu và biến động số dư</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem mục tiêu lớn, mục tiêu ngày, tuần và tháng.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("entry")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">📝</p>
          <h3 className="mt-3 text-xl font-bold">Ghi nhật kí</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ghi lại hôm nay làm gì, kiếm được bao nhiêu và làm mấy giờ.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("history")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">📚</p>
          <h3 className="mt-3 text-xl font-bold">Lịch sử nhật kí</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem lại, sửa hoặc xóa các ngày đã ghi.
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigateTo("expenses")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">💸</p>
          <h3 className="mt-3 text-xl font-bold">Lịch sử chi tiêu</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem lại chi tiêu ăn uống và các khoản khác theo ngày.
          </p>
        </button>
      </section>
    </>
  )}

{page === "goals" && (
  <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Các mục tiêu</h2>
        <p className="text-sm text-slate-500">
          Quản lý mục tiêu hiện tại và xem lại các mục tiêu đã hoàn thành.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigateTo("home", "menu")}
        className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
      >
        Về trang chủ
      </button>
    </div>

    {goalScreen === "balance" && (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Biến động tiền</h2>
            <p className="text-sm text-slate-500">
              Tính từ ngày bắt đầu mục tiêu: {currentGoalStartDate}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo("goals", "menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Mục tiêu</p>
            <p className="mt-1 font-bold">{goals.bigGoalName}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Tổng tiền hiện tại</p>
            <p className="mt-1 font-bold">
              {formatMoney(
                currentBalanceMovementData.at(-1)?.totalMoney ?? goals.bigGoalSaved
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Tiền thực tế hiện có</p>
            <p className="mt-1 font-bold">
              {formatMoney(
                currentBalanceMovementData.at(-1)?.actualMoney ?? goals.bigGoalSaved
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Số ngày theo dõi</p>
            <p className="mt-1 font-bold">
              {currentBalanceMovementData.length} ngày
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Biểu đồ biến động</h3>
              <p className="text-sm text-slate-500">
                {balanceChartTitle}
              </p>
              <p className="text-xs text-slate-500">
                Đường tổng tiền và tiền thực tế hiện có trong mục tiêu hiện tại.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBalanceChartDays("all")}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>

              <button
                type="button"
                onClick={() => setBalanceChartDays(7)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === 7
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                7 ngày
              </button>

              <button
                type="button"
                onClick={() => setBalanceChartDays(14)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === 14
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                14 ngày
              </button>

              <button
                type="button"
                onClick={() => setBalanceChartDays(30)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  balanceChartDays === 30
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                30 ngày
              </button>

              <input
                type="text"
                inputMode="numeric"
                value={balanceChartDays === "all" ? "" : String(balanceChartDays)}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/[^\d]/g, "");

                  if (!onlyDigits) {
                    setBalanceChartDays("all");
                    return;
                  }

                  const value = Number(onlyDigits);

                  setBalanceChartDays(Math.min(Math.max(value, 1), 365));
                }}
                className="w-24 rounded-xl border px-3 py-1 text-sm"
                placeholder="Tất cả"
              />
            </div>
          </div>

          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visibleBalanceMovementData.map((item: BalanceSnapshot) => ({
                  ...item,
                  label: item.date.slice(5),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="totalMoney"
                  name="Tổng tiền"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="actualMoney"
                  name="Tiền thực tế"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </>
)}

    {goalScreen === "menu" && (
      <section className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => navigateTo("goals", "current")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">🎯</p>
          <h3 className="mt-3 text-xl font-bold">Mục tiêu hiện tại</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem và chỉnh sửa mục tiêu đang thực hiện.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("goals", "balance")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">📈</p>
          <h3 className="mt-3 text-xl font-bold">Biến động tiền</h3>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tiền thực tế hiện có và tổng tiền theo từng ngày.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("goals", "completed")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">✅</p>
          <h3 className="mt-3 text-xl font-bold">Mục tiêu đã hoàn thành</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem lại các mục tiêu cũ và lịch sử biến động tiền.
          </p>
        </button>
      </section>
    )}

    {goalScreen === "current" && (
      <>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigateTo("goals", "menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={completeCurrentGoal}
            className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-green-700"
          >
            Hoàn thành mục tiêu
          </button>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      Thu nhập {safeChartDays} ngày gần nhất
                    </h2>
                    <p className="text-sm text-slate-500">
                      Biểu đồ tính tiền làm được + tiền thưởng, không tính tiền nhận được.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChartDays(7)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        chartDays === 7
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      7 ngày
                    </button>

                    <button
                      type="button"
                      onClick={() => setChartDays(14)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        chartDays === 14
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      14 ngày
                    </button>

                    <button
                      type="button"
                      onClick={() => setChartDays(30)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        chartDays === 30
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      30 ngày
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={String(chartDays)}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/[^\d]/g, "");
                        const value = Number(onlyDigits);

                        if (!value) {
                          setChartDays(1);
                          return;
                        }

                        setChartDays(Math.min(Math.max(value, 1), 365));
                      }}
                      className="w-24 rounded-xl border px-3 py-1 text-sm"
                      placeholder="Số ngày"
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Theo dõi tiền kiếm được từng ngày.
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm">
                Tiền / giờ tháng này:{" "}
                <strong>{formatMoney(incomePerHour)}</strong>
              </div>
            </div>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot
                    name="Thu nhập"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <label className="text-sm font-medium">Tiền nhận được</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 500.000"
                  value={form.receivedMoney}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      receivedMoney: formatMoneyInput(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              <p className="mt-1 text-xs text-slate-500">
                Khoản này tính vào tổng tiền, tuần, tháng và tiền hiện có, nhưng không tính
                vào tiền thực tế hôm nay và biểu đồ 7 ngày.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Tiền thưởng</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 100.000"
                  value={form.bonusMoney}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      bonusMoney: formatMoneyInput(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              <p className="mt-1 text-xs text-slate-500">
                Khoản này được tính như thu nhập bình thường.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Mục tiêu lớn</h2>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium">Tên mục tiêu</label>
                  <input
                    value={mainGoalForm.bigGoalName}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalName: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
              </div>

              <div>
                <label className="text-sm font-medium">Số tiền cần đạt</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mainGoalForm.bigGoalTarget}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalTarget: formatMoneyInput(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
              </div>

              <div>
                <label className="text-sm font-medium">Số tiền đã có sẵn</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mainGoalForm.bigGoalSaved}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalSaved: formatMoneyInput(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
              </div>

              <div>
                <label className="text-sm font-medium">Ngày bắt đầu mục tiêu</label>
                  <input
                    type="date"
                    value={mainGoalForm.bigGoalStartDate}
                    max={todayString}
                    onChange={(e) =>
                      setMainGoalForm((prev) => ({
                        ...prev,
                        bigGoalStartDate: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                <p className="mt-1 text-xs text-slate-500">
                  Biến động tiền sẽ được tính từ ngày này. Khi hoàn thành mục tiêu, hành trình
                  mới sẽ bắt đầu lại từ đầu.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Hạn mục tiêu</label>
                <input
                  type="date"
                  value={mainGoalForm.bigGoalDeadline}
                  onChange={(e) =>
                    setMainGoalForm((prev) => ({
                      ...prev,
                      bigGoalDeadline: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveMainGoal}
              className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
            >
              Lưu mục tiêu lớn
            </button>

            <div className="mt-5 rounded-xl bg-slate-100 p-4">
              <p className="font-bold">{goals.bigGoalName}</p>
              <p className="mt-1 text-sm">
                Bắt đầu: <strong>{goals.bigGoalStartDate ?? getToday()}</strong>
              </p>
              <p className="mt-2 text-sm">
                Đã có: <strong>{formatMoney(totalSavedForBigGoal)}</strong>
              </p>

              <p className="mt-1 text-sm">
                Còn thiếu: <strong>{formatMoney(remainingBigGoal)}</strong>
              </p>

              <p className="mt-1 text-sm">
                Còn lại: <strong>{daysLeft} ngày</strong>
              </p>

              <p className="mt-1 text-sm">
                Cần mỗi ngày: <strong>{formatMoney(needPerDay)}</strong>
              </p>

              <div
                className={`mt-3 rounded-xl p-3 ${
                  isBigGoalBehind ? "bg-red-50" : "bg-green-50"
                }`}
              >
                <p className="text-sm text-slate-500">Trạng thái tiến độ</p>
                <p
                  className={`font-bold ${
                    isBigGoalBehind ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {isBigGoalBehind ? "Đang chậm tiến độ" : "Đúng tiến độ"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Tiến độ tiền: {bigGoalProgress}% · Tiến độ thời gian:{" "}
                  {bigGoalTimeProgress}%
                </p>
              </div>

              <ProgressBar value={bigGoalProgress} />

              <p className="mt-2 text-sm font-medium">
                Hoàn thành {bigGoalProgress}%
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Mục tiêu ngày / tuần / tháng</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tiền / ngày</label>
              <input
                type="number"
                value={goals.dailyIncome}
                onChange={(e) => updateGoal("dailyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / ngày</label>
              <input
                type="number"
                value={goals.dailyHours}
                onChange={(e) => updateGoal("dailyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tiền / tuần</label>
              <input
                type="number"
                value={goals.weeklyIncome}
                onChange={(e) => updateGoal("weeklyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / tuần</label>
              <input
                type="number"
                value={goals.weeklyHours}
                onChange={(e) => updateGoal("weeklyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tiền / tháng</label>
              <input
                type="number"
                value={goals.monthlyIncome}
                onChange={(e) => updateGoal("monthlyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / tháng</label>
              <input
                type="number"
                value={goals.monthlyHours}
                onChange={(e) => updateGoal("monthlyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-bold">Mục tiêu phụ</h2>
      <p className="text-sm text-slate-500">
        Chia thủ công tiền vào từng mục tiêu phụ, ví dụ: Lens, quỹ dự phòng,
        trả nợ.
      </p>
    </div>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
    <div>
      <label className="text-sm font-medium">Tên mục tiêu</label>
      <input
        value={subGoalForm.name}
        onChange={(e) =>
          setSubGoalForm((prev) => ({
            ...prev,
            name: e.target.value,
          }))
        }
        placeholder="VD: Lens Sony"
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>

    <div>
      <label className="text-sm font-medium">Số tiền cần đạt</label>
      <input
        type="text"
        inputMode="numeric"
        value={subGoalForm.target}
        onChange={(e) =>
          setSubGoalForm((prev) => ({
            ...prev,
            target: formatMoneyInput(e.target.value),
          }))
        }
        placeholder="VD: 7.000.000"
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>

    <div>
      <label className="text-sm font-medium">Đã có sẵn</label>
      <input
        type="text"
        inputMode="numeric"
        value={subGoalForm.saved}
        onChange={(e) =>
          setSubGoalForm((prev) => ({
            ...prev,
            saved: formatMoneyInput(e.target.value),
          }))
        }
        placeholder="VD: 500.000"
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>

    <div>
      <label className="text-sm font-medium">Bắt đầu</label>
      <input
        type="date"
        value={subGoalForm.startDate}
        max={todayString}
        onChange={(e) =>
          setSubGoalForm((prev) => ({
            ...prev,
            startDate: e.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>

    <div>
      <label className="text-sm font-medium">Deadline</label>
      <input
        type="date"
        value={subGoalForm.deadline}
        onChange={(e) =>
          setSubGoalForm((prev) => ({
            ...prev,
            deadline: e.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>
  </div>

  <button
    type="button"
    onClick={addSubGoal}
    className="mt-4 rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
  >
    Thêm mục tiêu phụ
  </button>

  <div className="mt-6 grid gap-4">
    {(goals.subGoals ?? []).length === 0 ? (
      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
        Chưa có mục tiêu phụ nào.
      </p>
    ) : (
      (goals.subGoals ?? []).map((goal) => {
        const currentSaved = getSubGoalSaved(goal);
        const progress = getProgress(currentSaved, goal.target);
        const remaining = Math.max(goal.target - currentSaved, 0);
        const dailyNeed = getDailyNeedForGoal(
          goal.target,
          currentSaved,
          goal.deadline
        );
        const behind = isGoalBehind(goal);
        const progressData = buildSubGoalProgressData(goal);

        const contributionForm = subGoalContributionForms[goal.id] ?? {
          amount: "",
          note: "",
        };

        return (
          <article key={goal.id} className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{goal.name}</h3>
                <p className="text-sm text-slate-500">
                  Từ {goal.startDate} đến {goal.deadline}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => completeSubGoal(goal.id)}
                  className="rounded-lg bg-green-50 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  Hoàn thành
                </button>

                <button
                  type="button"
                  onClick={() => deleteSubGoal(goal.id)}
                  className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  Xóa
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Đã có</p>
                <p className="font-bold">{formatMoney(currentSaved)}</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Mục tiêu</p>
                <p className="font-bold">{formatMoney(goal.target)}</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Còn thiếu</p>
                <p className="font-bold">{formatMoney(remaining)}</p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-sm text-slate-500">Cần mỗi ngày</p>
                <p className="font-bold">{formatMoney(dailyNeed)}</p>
              </div>

              <div
                className={`rounded-xl p-3 ${
                  behind ? "bg-red-50" : "bg-green-50"
                }`}
              >
                <p className="text-sm text-slate-500">Trạng thái</p>
                <p
                  className={`font-bold ${
                    behind ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {behind ? "Đang chậm tiến độ" : "Đúng tiến độ"}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar value={progress} />
              <p className="mt-2 text-sm font-medium">
                Hoàn thành {progress}%
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Góp thêm</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={contributionForm.amount}
                  onChange={(e) =>
                    setSubGoalContributionForms((prev) => ({
                      ...prev,
                      [goal.id]: {
                        ...contributionForm,
                        amount: formatMoneyInput(e.target.value),
                      },
                    }))
                  }
                  placeholder="VD: 200.000"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ghi chú</label>
                <input
                  value={contributionForm.note}
                  onChange={(e) =>
                    setSubGoalContributionForms((prev) => ({
                      ...prev,
                      [goal.id]: {
                        ...contributionForm,
                        note: e.target.value,
                      },
                    }))
                  }
                  placeholder="VD: Góp từ tiền hôm nay"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => addContributionToSubGoal(goal.id)}
                  className="w-full rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
                >
                  Góp vào mục tiêu
                </button>
              </div>
            </div>

            {progressData.length > 0 && (
              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressData.map((item) => ({
                      ...item,
                      label: item.date.slice(5),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "progress") return `${value}%`;
                        return formatMoney(Number(value));
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="saved"
                      name="Đã có"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>
        );
      })
    )}
  </div>
        </section>
      </>
    )}

    {goalScreen === "completed" && (
      <>
        <div>
          <button
            type="button"
            onClick={() => setGoalScreen("menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Các mục tiêu đã hoàn thành</h2>

          {completedGoals.length === 0 ? (
            <p className="mt-4 text-slate-500">
              Bạn chưa hoàn thành mục tiêu nào.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {completedGoals.map((goal) => (
                <article key={goal.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{goal.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Hoàn thành ngày: {goal.completedAt}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                        Đã hoàn thành
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompletedGoalId(goal.id);
                          navigateTo("goals", "completedDetail");
                        }}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
                      >
                        Xem chi tiết
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCompletedGoal(goal.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Mục tiêu</p>
                      <p className="font-bold">{formatMoney(goal.target)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Đã có khi hoàn thành</p>
                      <p className="font-bold">{formatMoney(goal.saved)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Hạn mục tiêu</p>
                      <p className="font-bold">{goal.deadline}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </>
    )}

    {goalScreen === "completedDetail" && (
  <>
    {!selectedCompletedGoal ? (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Không tìm thấy mục tiêu</h2>

        <p className="mt-2 text-sm text-slate-500">
          Có thể mục tiêu này đã bị xóa hoặc chưa được chọn.
        </p>

        <button
          type="button"
          onClick={() => navigateTo("goals", "completed")}
          className="mt-4 rounded-xl border bg-white px-4 py-2 font-medium hover:bg-slate-100"
        >
          Quay lại
        </button>
      </section>
    ) : (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              {selectedCompletedGoal.name}
            </h2>

            <p className="text-sm text-slate-500">
              Từ {selectedCompletedGoal.startDate ?? "Không rõ"} đến{" "}
              {selectedCompletedGoal.completedAt}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo("goals", "completed")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Mục tiêu</p>
            <p className="mt-1 text-lg font-bold">
              {formatMoney(selectedCompletedGoal.target)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Đã đạt</p>
            <p className="mt-1 text-lg font-bold">
              {formatMoney(selectedCompletedGoal.saved)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Deadline</p>
            <p className="mt-1 text-lg font-bold">
              {selectedCompletedGoal.deadline}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Ngày hoàn thành</p>
            <p className="mt-1 text-lg font-bold">
              {selectedCompletedGoal.completedAt}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold">
            Biến động tiền của mục tiêu này
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Gồm tổng tiền và tiền thực tế hiện có trong thời gian thực hiện mục
            tiêu.
          </p>

          {!selectedCompletedGoal.balanceSnapshots ||
          selectedCompletedGoal.balanceSnapshots.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
              Mục tiêu này chưa có dữ liệu biến động tiền. Những mục tiêu hoàn
              thành trước khi thêm chức năng này có thể sẽ không có biểu đồ.
            </p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={selectedCompletedGoal.balanceSnapshots.map((item: BalanceSnapshot) => ({
                    ...item,
                    label: item.date.slice(5),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />

                  <Line
                    type="monotone"
                    dataKey="totalMoney"
                    name="Tổng tiền"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="actualMoney"
                    name="Tiền thực tế"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {selectedCompletedGoal.goalProgressSnapshots &&
          selectedCompletedGoal.goalProgressSnapshots.length > 0 && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-xl font-bold">Tiến độ mục tiêu phụ</h3>

              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={selectedCompletedGoal.goalProgressSnapshots.map((item) => ({
                      ...item,
                      label: item.date.slice(5),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "progress") return `${value}%`;
                        return formatMoney(Number(value));
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="saved"
                      name="Đã có"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {selectedCompletedGoal.contributionsSnapshot &&
  selectedCompletedGoal.contributionsSnapshot.length > 0 && (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">Lịch sử góp tiền</h3>

      <div className="mt-4 grid gap-3">
        {selectedCompletedGoal.contributionsSnapshot.map((item) => (
          <article key={item.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-bold">{item.date}</h4>
                <p className="text-sm text-slate-500">
                  Góp: {formatMoney(item.amount)}
                </p>
              </div>
            </div>

            {item.note && (
              <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {item.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng thu</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.totalIncome ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng chi</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.totalExpense ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tiền thực tế</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.actualMoney ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng hành trình</p>
    <p className="mt-1 text-lg font-bold">
      {formatMoney(selectedCompletedGoal.totalJourneyMoney ?? 0)}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng giờ</p>
    <p className="mt-1 text-lg font-bold">
      {selectedCompletedGoal.totalHours ?? 0} giờ
    </p>
  </div>

  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">Tổng đơn</p>
    <p className="mt-1 text-lg font-bold">
      {selectedCompletedGoal.totalOrders ?? 0} đơn
    </p>
  </div>
</section>

        {selectedCompletedGoal.balanceSnapshots &&
        selectedCompletedGoal.balanceSnapshots.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">Chi tiết từng ngày</h3>

            <div className="mt-4 grid gap-3">
              {selectedCompletedGoal.balanceSnapshots.map((item: BalanceSnapshot) => (
                <article
                  key={item.date}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold">{item.date}</h4>
                      <p className="text-sm text-slate-500">
                        Thu: {formatMoney(item.income)} · Chi:{" "}
                        {formatMoney(item.expense)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Tổng tiền</p>
                      <p className="font-bold">{formatMoney(item.totalMoney)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Tiền thực tế</p>
                      <p className="font-bold">{formatMoney(item.actualMoney)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
  
  {selectedCompletedGoal.expensesSnapshot &&
  selectedCompletedGoal.expensesSnapshot.length > 0 && (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">Chi tiêu trong mục tiêu này</h3>

      <div className="mt-4 grid gap-3">
        {selectedCompletedGoal.expensesSnapshot.map((expense) => {
          const total = getExpenseTotal(expense);

          return (
            <article key={expense.id} className="rounded-xl border p-4">
              <div>
                <h4 className="font-bold">{expense.date}</h4>
                <p className="text-sm text-slate-500">
                  Tổng chi: {formatMoney(total)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Sáng</p>
                  <p className="font-bold">{formatMoney(expense.breakfast)}</p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Trưa</p>
                  <p className="font-bold">{formatMoney(expense.lunch)}</p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Tối</p>
                  <p className="font-bold">{formatMoney(expense.dinner)}</p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-slate-500">Khác</p>
                  <p className="font-bold">{formatMoney(expense.other)}</p>
                </div>
              </div>

              {expense.note && (
                <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                  {expense.note}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  )}

  {selectedCompletedGoal.entriesSnapshot &&
  selectedCompletedGoal.entriesSnapshot.length > 0 && (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold">Nhật ký trong mục tiêu này</h3>

      <div className="mt-4 grid gap-3">
        {selectedCompletedGoal.entriesSnapshot.map((entry) => (
          <article key={entry.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-bold">{entry.date}</h4>
                <p className="text-sm text-slate-500">
                  Thu: {formatMoney(getTotalEntryMoney(entry))} ·{" "}
                  {entry.workHours} giờ · {entry.orderCount ?? 0} đơn
                </p>
              </div>
            </div>

            {entry.diary && (
              <p className="mt-3 whitespace-pre-line text-sm">{entry.diary}</p>
            )}

            {entry.note && (
              <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {entry.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )}
      </>
    )}
  </>
    )}
      </>
)}

  {page === "entry" && (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {editingDate ? "Sửa nhật kí" : "Ghi nhật kí"}
          </h2>
          <p className="text-sm text-slate-500">
            Ghi lại một ngày của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("home", "menu")}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Về trang chủ
        </button>
      </div>
      
      <section className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleExpenseSubmit}
        className="rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-bold">
          {editingExpenseDate ? "Sửa chi tiêu" : "Chi tiêu hôm nay"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Nhập chi tiêu ăn uống và khoản khác trong ngày.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Ngày</label>
            <input
              type="date"
              value={expenseForm.date}
              max={todayString}
              onChange={(e) =>
                setExpenseForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Ăn sáng</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 30.000"
                value={expenseForm.breakfast}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    breakfast: formatMoneyInput(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
          </div>

          <div>
            <label className="text-sm font-medium">Ăn trưa</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 50.000"
                value={expenseForm.lunch}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    lunch: formatMoneyInput(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
          </div>

          <div>
            <label className="text-sm font-medium">Ăn tối</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 40.000"
                value={expenseForm.dinner}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    dinner: formatMoneyInput(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
          </div>

          <div>
            <label className="text-sm font-medium">Khác</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 20.000"
                value={expenseForm.other}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    other: formatMoneyInput(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
          </div>

          <div className="rounded-xl bg-slate-100 p-3 text-sm">
            <p className="text-slate-500">Tổng chi tiêu đang nhập</p>
            <p className="mt-1 text-lg font-bold">
                {formatMoney(
                  parseMoneyInput(expenseForm.breakfast) +
                    parseMoneyInput(expenseForm.lunch) +
                    parseMoneyInput(expenseForm.dinner) +
                    parseMoneyInput(expenseForm.other)
                )}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Ghi chú chi tiêu</label>
          <textarea
            rows={3}
            value={expenseForm.note}
            onChange={(e) =>
              setExpenseForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="VD: Ăn trưa với bạn, mua nước, gửi xe..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
        >
          {editingExpenseDate ? "Cập nhật chi tiêu" : "Lưu chi tiêu"}
        </button>

        {editingExpenseDate && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpenseDate(null);
                    setExpenseForm({
                      date: getToday(),
                      breakfast: "",
                      lunch: "",
                      dinner: "",
                      other: "",
                      note: "",
                    });
                  }}
                  className="mt-4 rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
                >
                  Hủy sửa
                </button>
        )}
      </form>


      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-bold">
          {editingDate ? `Sửa nhật ký ngày ${editingDate}` : "Ghi nhật ký hôm nay"}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Ngày</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tâm trạng</label>
            <select
              value={form.mood}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  mood: e.target.value as Mood,
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value="good">Vui</option>
              <option value="normal">Bình thường</option>
              <option value="tired">Mệt</option>
              <option value="bad">Tệ</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Tiền kiếm được</label>
              <input
                type="text"
                inputMode="numeric"  
                placeholder="VD: 250.000"
                value={form.income}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    income: formatMoneyInput(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
          </div>

          <div>
            <label className="text-sm font-medium">Tiền nhận được</label>
            <input
              type="number"
              placeholder="VD: 800000"
              value={form.receivedMoney}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  receivedMoney: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Tiền thưởng</label>
            <input
              type="number"
              placeholder="VD: 100000"
              value={form.bonusMoney}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  bonusMoney: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Số lượng đơn</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="VD: 12"
              value={form.orderCount}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/[^\d]/g, "");

                setForm((prev) => ({
                  ...prev,
                  orderCount: onlyDigits,
                }));
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Số giờ làm việc</label>
            <input
              type="number"
              step="0.5"
              placeholder="VD: 4"
              value={form.workHours}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, workHours: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">
            Hôm nay mình đã làm gì?
          </label>
          <textarea
            rows={4}
            value={form.diary}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, diary: e.target.value }))
            }
            placeholder="VD: Hôm nay chạy đơn buổi sáng, hơi mệt nhưng vẫn cố hoàn thành..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Ghi chú thêm</label>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="VD: Mai cần dậy sớm hơn, tối ưu khung giờ làm việc..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
          >
            {editingDate ? "Cập nhật nhật ký" : "Lưu nhật ký"}
          </button>

          {editingDate && (
            <button
              type="button"
              onClick={() => {
                setEditingDate(null);
                setForm({
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
              }}
              className="rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>
      </section>
    </>
  )}

  {page === "history" && (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử nhật kí</h2>
          <p className="text-sm text-slate-500">
            Xem lại, sửa hoặc xóa các ngày đã ghi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("home", "menu")}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Về trang chủ
        </button>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-sm font-medium">Tìm kiếm</label>
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Tìm theo ngày, nhật kí, ghi chú..."
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Từ ngày</label>
            <input
              type="date"
              value={historyFromDate}
              onChange={(e) => setHistoryFromDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Đến ngày</label>
            <input
              type="date"
              value={historyToDate}
              onChange={(e) => setHistoryToDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHistoryQuickFilter("today")}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
          >
            Hôm nay
          </button>

          <button
            type="button"
            onClick={() => setHistoryQuickFilter("7days")}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
          >
            7 ngày
          </button>

          <button
            type="button"
            onClick={() => setHistoryQuickFilter("month")}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
          >
            Tháng này
          </button>

          <button
            type="button"
            onClick={() => setHistoryQuickFilter("all")}
            className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Xóa lọc
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Số bản ghi</p>
          <p className="mt-1 text-xl font-bold">{filteredEntries.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tổng ngày lọc</p>
          <p className="mt-1 text-xl font-bold">
            {formatMoney(filteredEntriesTotalMoney)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tính cho biểu đồ</p>
          <p className="mt-1 text-xl font-bold">
            {formatMoney(filteredEntriesNormalMoney)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tổng giờ</p>
          <p className="mt-1 text-xl font-bold">{filteredEntriesHours} giờ</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tổng đơn</p>
          <p className="mt-1 text-xl font-bold">{filteredEntriesOrders} đơn</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        {sortedEntries.length === 0 ? (
          <p className="text-slate-500">
            Chưa có nhật ký nào. Hãy nhập ngày đầu tiên của bạn.
          </p>
        ) : (
        <div className="grid gap-3">
          {paginatedEntries.map((entry) => {
            const mainIncome = getMainIncome(entry);
            const receivedMoney = getReceivedMoney(entry);
            const bonusMoney = getBonusMoney(entry);
            // const normalIncome = getNormalIncome(entry);
            const totalEntryMoney = getTotalEntryMoney(entry);

            return (
              <article key={entry.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{entry.date}</h3>
                    <p className="text-sm text-slate-500">
                      Tổng ngày này: {formatMoney(totalEntryMoney)} ·{" "}
                      {entry.workHours} giờ · {moodLabels[entry.mood]}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editEntry(entry)}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:text-sm lg:grid-cols-6">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-slate-500">Tiền làm được</p>
                    <p className="font-bold">{formatMoney(mainIncome)}</p>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-slate-500">Tiền thưởng</p>
                    <p className="font-bold">{formatMoney(bonusMoney)}</p>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-slate-500">Tiền nhận được</p>
                    <p className="font-bold">{formatMoney(receivedMoney)}</p>
                  </div>

                  {/* <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-slate-500">Tính cho biểu đồ</p>
                    <p className="font-bold">{formatMoney(normalIncome)}</p>
                  </div> */}

                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-slate-500">Tổng ngày này</p>
                    <p className="font-bold">{formatMoney(totalEntryMoney)}</p>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-slate-500">Giờ làm</p>
                    <p className="font-bold">{entry.workHours} giờ</p>
                  </div>

                  <div className="min-w-0 rounded-xl bg-slate-100 p-2 sm:p-3">
                    <p className="truncate text-slate-500">Số đơn</p>
                    <p className="break-words text-sm font-bold sm:text-base">
                      {entry.orderCount ?? 0} đơn
                    </p>
                  </div>
                </div>

                {entry.diary && (
                  <p className="mt-3 whitespace-pre-line">{entry.diary}</p>
                )}

                {entry.note && (
                  <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                    {entry.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        )}
        {filteredEntries.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                setHistoryCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={historyCurrentPage === 1}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>

            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium">
              Trang {historyCurrentPage} / {historyTotalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setHistoryCurrentPage((prev) =>
                  Math.min(prev + 1, historyTotalPages)
                )
              }
              disabled={historyCurrentPage === historyTotalPages}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        )}
      </section>

    </>
  )}

  {page === "expenses" && (
  <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Lịch sử chi tiêu</h2>
        <p className="text-sm text-slate-500">
          Xem lại chi tiêu ăn uống và các khoản khác theo ngày.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigateTo("home", "menu")}
        className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
      >
        Về trang chủ
      </button>
    </div>

    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="text-sm font-medium">Tìm kiếm</label>
          <input
            type="text"
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            placeholder="Tìm theo ngày hoặc ghi chú chi tiêu..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Từ ngày</label>
          <input
            type="date"
            value={expenseFromDate}
            onChange={(e) => setExpenseFromDate(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Đến ngày</label>
          <input
            type="date"
            value={expenseToDate}
            onChange={(e) => setExpenseToDate(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpenseQuickFilter("today")}
          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
        >
          Hôm nay
        </button>

        <button
          type="button"
          onClick={() => setExpenseQuickFilter("7days")}
          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
        >
          7 ngày
        </button>

        <button
          type="button"
          onClick={() => setExpenseQuickFilter("month")}
          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
        >
          Tháng này
        </button>

        <button
          type="button"
          onClick={() => setExpenseQuickFilter("all")}
          className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          Xóa lọc
        </button>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Số bản ghi</p>
        <p className="mt-1 text-xl font-bold">{filteredExpenses.length}</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Tổng chi tiêu</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(filteredExpensesTotal)}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Trung bình / bản ghi</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(
            filteredExpenses.length > 0
              ? Math.round(filteredExpensesTotal / filteredExpenses.length)
              : 0
          )}
        </p>
      </div>
    </section>

    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {expenses.length === 0 ? (
        <p className="text-slate-500">
          Chưa có dữ liệu chi tiêu nào.
        </p>
      ) : (
        <div className="grid gap-3">
          {paginatedExpenses.map((expense) => {
              const total =
                expense.breakfast +
                expense.lunch +
                expense.dinner +
                expense.other;

              return (
                <article key={expense.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{expense.date}</h3>
                      <p className="text-sm text-slate-500">
                        Tổng chi tiêu: {formatMoney(total)}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editExpense(expense)}
                        className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteExpense(expense.id)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Ăn sáng</p>
                      <p className="font-bold">
                        {formatMoney(expense.breakfast)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Ăn trưa</p>
                      <p className="font-bold">
                        {formatMoney(expense.lunch)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Ăn tối</p>
                      <p className="font-bold">
                        {formatMoney(expense.dinner)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Khác</p>
                      <p className="font-bold">
                        {formatMoney(expense.other)}
                      </p>
                    </div>
                  </div>

                  {expense.note && (
                    <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                      {expense.note}
                    </p>
                  )}
                </article>
              );
            })}
        </div>
      )}
      {filteredExpenses.length > ITEMS_PER_PAGE && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              setExpenseCurrentPage((prev) => Math.max(prev - 1, 1))
            }
            disabled={expenseCurrentPage === 1}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>

          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium">
            Trang {expenseCurrentPage} / {expenseTotalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setExpenseCurrentPage((prev) =>
                Math.min(prev + 1, expenseTotalPages)
              )
            }
            disabled={expenseCurrentPage === expenseTotalPages}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </section>
  </>
  )}
</main>
)}
    </div>
  );
}