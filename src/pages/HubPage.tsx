import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_HUB_SETTINGS,
  DEFAULT_JOIN_PRICES,
  HUB_SHIFT_OPTIONS_BY_TYPE,
  HUB_TYPE_LABEL,
  STORAGE_HUB_CHANGE_LOGS_KEY,
  STORAGE_HUB_CALCULATOR_KEY,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "../constants/hanoiHub";
import { supabase } from "../lib/supabase";
import { getDateString, getToday, toDate } from "../utils/date";
import {
  buildHubAnalyticsRows,
  buildHubReport,
  filterHubRowsByDate,
  getMonthRangeFromDate,
  getWeekRangeFromDate,
  groupHubPerformance,
  summarizeHubRows,
} from "../utils/hubAnalytics";
import { calculateHubIncome } from "../utils/hubIncome";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/money";
import type { ExpenseEntry, Mood } from "../types";
import type {
  HubChangeLog,
  HubEntry,
  HubJoinOrder,
  HubSettings,
} from "../types/hub";
import { DeleteShiftDialog } from "../features/shifts/components/DeleteShiftDialog";
import { CalculatorPage } from "../features/hub/components/calculator/CalculatorPage";
import { HubSettingsPage } from "../features/hub/components/settings/HubSettingsPage";
import { MyShiftsPage } from "../features/hub/components/shifts/MyShiftsPage";
import { HubStatisticsPage } from "../features/hub/components/statistics/HubStatisticsPage";
import {
  DailyJournalSection,
  HubDailySummary,
  HubNavigation,
  HubWorkHeader,
  MatchedOrderSection,
  OtherIncomeSection,
  SaveShiftActionBar,
  ShiftSummaryCard,
  WorkShiftSection,
  type HubForm,
  type HubJoinForm,
  type HubCalculatorForm,
  type HubStatisticsRange,
  type HubTab,
  type HubTimeFilter,
  type HubTypeFilter,
} from "../features/hub/components/work";

export type HubDiaryPayload = {
  receivedMoney: number;
  bonusMoney: number;
  mood: Mood;
  diary: string;
  note: string;
  orderCount: number;
  workHours: number;
};

export type HubDiaryContribution = {
  date: string;
  income: number;
  orderCount: number;
  workHours: number;
};

const HUB_CHANGE_LOG_PAGE_SIZE = 5;

function loadJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function getDefaultJoinPrice(type: number, settings: HubSettings) {
  if (type === 2) return settings.join2Price;
  if (type === 3) return settings.join3Price;
  if (type === 4) return settings.join4Price;
  if (type === 5) return settings.join5Price;

  return DEFAULT_JOIN_PRICES[type] ?? settings.orderPrice;
}

function createJoinForm(type = 2, price = DEFAULT_JOIN_PRICES[2]): HubJoinForm {
  return {
    id: crypto.randomUUID(),
    type: String(type),
    quantity: "1",
    price: formatMoneyInput(String(price)),
  };
}

function createForm(): HubForm {
  return {
    date: getToday(),
    hubType: "HUB_5",
    shiftName: HUB_SHIFT_OPTIONS_BY_TYPE.HUB_5[0],
    order: "",
    joins: [],
    isWellDone: true,
    isHubShort: false,
    extraIncome: "",
    receivedMoney: "",
    bonusMoney: "",
    mood: "normal",
    diary: "",
    note: "",
  };
}

function createFormFromEntry(entry: HubEntry): HubForm {
  return {
    date: entry.date,
    hubType: entry.hubType,
    shiftName: entry.shiftName || HUB_SHIFT_OPTIONS_BY_TYPE[entry.hubType][0],
    order: formatMoneyInput(String(entry.order)),
    joins: entry.joins.map((join) => ({
      id: join.id ?? crypto.randomUUID(),
      type: String(join.type),
      quantity: formatMoneyInput(String(getJoinQuantity(join))),
      price: formatMoneyInput(String(join.price)),
    })),
    isWellDone: entry.isWellDone,
    isHubShort: entry.isHubShort,
    extraIncome: formatMoneyInput(String(entry.extraIncome)),
    receivedMoney: "",
    bonusMoney: "",
    mood: "normal",
    diary: "",
    note: entry.note,
  };
}

function createCalculatorForm(): HubCalculatorForm {
  return {
    date: getToday(),
    negativeWallet: "",
    target: "",
  };
}

function parseSignedMoneyInput(value: string) {
  const amount = parseMoneyInput(value);
  return value.trim().startsWith("-") ? -amount : amount;
}

function formatSignedMoneyInput(value: string) {
  const isNegative = value.trim().startsWith("-");
  const formattedValue = formatMoneyInput(value);

  if (!formattedValue) return isNegative ? "-" : "";

  return `${isNegative ? "-" : ""}${formattedValue}`;
}

function addDays(dateString: string, amount: number) {
  const date = toDate(dateString);
  date.setDate(date.getDate() + amount);

  return getDateString(date);
}

function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);

  return getDateString(date).slice(0, 7);
}

function getMonthEnd(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return getDateString(new Date(year, month, 0));
}

function getWeekRange(dateString: string, weekOffset = 0) {
  const date = toDate(dateString);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - day + 1 + weekOffset * 7);
  const fromDate = getDateString(date);
  date.setDate(date.getDate() + 6);

  return {
    fromDate,
    toDate: getDateString(date),
  };
}

function getDateRangeForFilter(filter: HubTimeFilter, today: string) {
  const thisMonth = today.slice(0, 7);
  const previousMonth = addMonths(thisMonth, -1);

  if (filter === "last3") {
    return { fromDate: addDays(today, -2), toDate: today };
  }

  if (filter === "today") {
    return { fromDate: today, toDate: today };
  }

  if (filter === "previousWeek") {
    return getWeekRange(today, -1);
  }

  if (filter === "thisWeek") {
    return getWeekRange(today);
  }

  if (filter === "thisMonth") {
    return { fromDate: `${thisMonth}-01`, toDate: getMonthEnd(thisMonth) };
  }

  if (filter === "previousMonth") {
    return {
      fromDate: `${previousMonth}-01`,
      toDate: getMonthEnd(previousMonth),
    };
  }

  return { fromDate: "", toDate: "" };
}

function getStatisticsDateRange(range: HubStatisticsRange, today: string) {
  if (range === "last7") return { fromDate: addDays(today, -6), toDate: today };
  if (range === "last14") return { fromDate: addDays(today, -13), toDate: today };
  if (range === "last30") return { fromDate: addDays(today, -29), toDate: today };

  const monthKey = today.slice(0, 7);
  return { fromDate: `${monthKey}-01`, toDate: getMonthEnd(monthKey) };
}

function getCalendarDays(monthKey: string, markedDates: Set<string>) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const calendarStart = new Date(year, month - 1, 1 - leadingDays);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const dateString = getDateString(date);

    return {
      date: dateString,
      day: date.getDate(),
      isCurrentMonth: dateString.startsWith(monthKey),
      hasEntry: markedDates.has(dateString),
    };
  });
}

function formatDateLabel(dateString: string) {
  if (!dateString) return "";

  return new Intl.DateTimeFormat("vi-VN").format(toDate(dateString));
}

function getRangeLabel(fromDate: string, toDate: string) {
  if (!fromDate && !toDate) return "Tất cả thời gian";
  if (fromDate && toDate && fromDate === toDate) return formatDateLabel(fromDate);
  if (fromDate && toDate) {
    return `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`;
  }
  if (fromDate) return `Từ ${formatDateLabel(fromDate)}`;

  return `Đến ${formatDateLabel(toDate)}`;
}

function getJoinQuantity(join: HubJoinOrder) {
  return join.quantity ?? join.order ?? 0;
}

function getJoinChildOrderCount(joins: HubJoinOrder[]) {
  return joins.reduce((sum, join) => {
    return sum + getJoinQuantity(join) * join.type;
  }, 0);
}

function getShiftHours(shiftName: string) {
  const match = shiftName.match(
    /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/
  );

  if (!match) return 0;

  const [, startHour, startMinute, endHour, endMinute] = match;
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  const duration = end >= start ? end - start : end + 24 * 60 - start;

  return Math.round((duration / 60) * 10) / 10;
}

function toHubJoins(rows: HubJoinForm[]): HubJoinOrder[] {
  return rows
    .map((row) => {
      const type = parseMoneyInput(row.type);
      const quantity = parseMoneyInput(row.quantity);
      const price = parseMoneyInput(row.price);

      return {
        id: row.id,
        type,
        quantity,
        order: quantity,
        price,
      };
    })
    .filter((join) => join.type > 0 && getJoinQuantity(join) > 0);
}

function getHubDiaryContribution(
  entry: HubEntry,
  settings: HubSettings
): HubDiaryContribution {
  const income = calculateHubIncome(entry, settings);

  return {
    date: entry.date,
    income: entry.diaryIncomeAmount ?? income.total,
    orderCount: entry.diaryOrderCount ?? entry.order,
    workHours: entry.diaryWorkHours ?? getShiftHours(entry.shiftName),
  };
}

function createHubDiaryContribution(
  entry: HubEntry,
  settings: HubSettings
): HubDiaryContribution {
  const income = calculateHubIncome(entry, settings);

  return {
    date: entry.date,
    income: income.workIncome,
    orderCount: entry.order,
    workHours: getShiftHours(entry.shiftName),
  };
}

function getHubSyncTime(item: { createdAt?: string; updatedAt?: string }) {
  return new Date(
    item.updatedAt ?? item.createdAt ?? "1970-01-01T00:00:00.000Z"
  ).getTime();
}

function mergeHubEntries(cloudItems: HubEntry[], localItems: HubEntry[]) {
  const map = new Map<string, HubEntry>();

  [...localItems, ...cloudItems].forEach((item) => {
    const current = map.get(item.id);

    if (!current || getHubSyncTime(item) >= getHubSyncTime(current)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function mergeHubChangeLogs(
  cloudItems: HubChangeLog[],
  localItems: HubChangeLog[]
) {
  const map = new Map<string, HubChangeLog>();

  [...localItems, ...cloudItems].forEach((item) => {
    const current = map.get(item.id);

    if (!current || getHubSyncTime(item) >= getHubSyncTime(current)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

function isMissingHubCloudColumn(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("hub_entries") ||
      error?.message?.includes("hub_settings") ||
      error?.message?.includes("hub_change_logs")
  );
}

function createHubChangeLog({
  action,
  previousEntry,
  nextEntry,
}: {
  action: HubChangeLog["action"];
  previousEntry?: HubEntry;
  nextEntry?: HubEntry;
}): HubChangeLog {
  const entry = nextEntry ?? previousEntry;
  const now = new Date().toISOString();
  const actionLabel: Record<HubChangeLog["action"], string> = {
    create: "Thêm ca",
    update: "Cập nhật ca",
    delete: "Xóa ca",
    restore: "Khôi phục ca",
  };

  return {
    id: crypto.randomUUID(),
    action,
    entryId: entry?.id ?? crypto.randomUUID(),
    date: entry?.date ?? getToday(),
    title: `${actionLabel[action]} ${entry ? HUB_TYPE_LABEL[entry.hubType] : "Hub"}`,
    description: entry
      ? `${entry.date} · ${HUB_TYPE_LABEL[entry.hubType]} · ${
          entry.shiftName || "Chưa có ca"
        }`
      : "Thay đổi dữ liệu Hub",
    previousEntry,
    nextEntry,
    createdAt: now,
  };
}

type HubPageProps = {
  expenses?: ExpenseEntry[];
  onAdjustDiaryContribution?: (
    previousContribution: HubDiaryContribution | null,
    nextContribution: HubDiaryContribution | null
  ) => void;
  onMigrateLegacyDiaryIncome?: (
    date: string,
    previousIncome: number,
    nextIncome: number
  ) => void;
  onSaveToDiary?: (
    date: string,
    amount: number,
    diaryPayload: HubDiaryPayload
  ) => void;
};

export function HubPage({
  expenses = [],
  onAdjustDiaryContribution,
  onMigrateLegacyDiaryIncome,
  onSaveToDiary,
}: HubPageProps) {
  const [tab, setTab] = useState<HubTab>("add");
  const [entries, setEntries] = useState<HubEntry[]>(() =>
    loadJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, [])
  );
  const [settings, setSettings] = useState<HubSettings>(() => ({
    ...DEFAULT_HUB_SETTINGS,
    ...loadJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {}),
  }));
  const [changeLogs, setChangeLogs] = useState<HubChangeLog[]>(() =>
    loadJson<HubChangeLog[]>(STORAGE_HUB_CHANGE_LOGS_KEY, [])
  );
  const [hubChangeLogPage, setHubChangeLogPage] = useState(1);
  const [expandedShiftIds, setExpandedShiftIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<HubEntry | null>(
    null
  );
  const [isDeletingShift, setIsDeletingShift] = useState(false);
  const [deleteShiftError, setDeleteShiftError] = useState("");
  const [hubCloudStatus, setHubCloudStatus] = useState(
    "Hub đang lưu trên thiết bị"
  );
  const [hubCloudReady, setHubCloudReady] = useState(false);
  const [form, setForm] = useState<HubForm>(() => createForm());
  const [calculatorForm, setCalculatorForm] = useState<HubCalculatorForm>(() => ({
    ...createCalculatorForm(),
    ...loadJson<Partial<HubCalculatorForm>>(STORAGE_HUB_CALCULATOR_KEY, {}),
  }));
  const [listHubTypeFilter, setListHubTypeFilter] =
    useState<HubTypeFilter>("ALL");
  const [editingHubEntryId, setEditingHubEntryId] = useState<string | null>(
    null
  );
  const [listTimeFilter, setListTimeFilter] =
    useState<HubTimeFilter>("today");
  const [listCustomFromDate, setListCustomFromDate] = useState(getToday());
  const [listCustomToDate, setListCustomToDate] = useState(getToday());
  const [listCalendarMonth, setListCalendarMonth] = useState(
    getToday().slice(0, 7)
  );
  const [statisticsRange, setStatisticsRange] =
    useState<HubStatisticsRange>("last7");
  const [statisticsHubFilter, setStatisticsHubFilter] =
    useState<HubTypeFilter>("ALL");
  const [statisticsCustomFromDate, setStatisticsCustomFromDate] =
    useState(getToday());
  const [statisticsCustomToDate, setStatisticsCustomToDate] =
    useState(getToday());
  const [showIncomeDetails, setShowIncomeDetails] = useState(false);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const saveShiftLockRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_HUB_ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HUB_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_HUB_CHANGE_LOGS_KEY,
      JSON.stringify(changeLogs.slice(0, 200))
    );
  }, [changeLogs]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_HUB_CALCULATOR_KEY,
      JSON.stringify(calculatorForm)
    );
  }, [calculatorForm]);

  useEffect(() => {
    let active = true;

    async function loadHubCloudData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!active || !userId) {
        if (active) setHubCloudStatus("Hub đang lưu trên thiết bị");
        return;
      }

      setHubCloudStatus("Đang tải dữ liệu Hub cloud...");

      const { data, error } = await supabase
        .from("money_diary_state")
        .select("hub_entries, hub_settings, hub_change_logs")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setHubCloudReady(false);
        setHubCloudStatus(
          isMissingHubCloudColumn(error)
            ? "Cloud chưa có cột Hub. Hãy chạy migration để đồng bộ Hub."
            : "Lỗi tải Hub cloud"
        );
        return;
      }

      const cloudEntries = data?.hub_entries
        ? ((data.hub_entries || []) as unknown as HubEntry[])
        : [];
      const cloudSettings = data?.hub_settings
        ? ({
            ...DEFAULT_HUB_SETTINGS,
            ...((data.hub_settings || {}) as unknown as Partial<HubSettings>),
          } as HubSettings)
        : null;
      const cloudChangeLogs = data?.hub_change_logs
        ? ((data.hub_change_logs || []) as unknown as HubChangeLog[])
        : [];
      const mergedEntries = mergeHubEntries(cloudEntries, entries);
      const mergedChangeLogs = mergeHubChangeLogs(cloudChangeLogs, changeLogs);

      setEntries(mergedEntries);
      if (cloudSettings) setSettings(cloudSettings);
      setChangeLogs(mergedChangeLogs);
      setHubCloudReady(true);
      setHubCloudStatus("Hub đã đồng bộ cloud");
    }

    void loadHubCloudData();

    return () => {
      active = false;
    };
    // Chỉ kéo cloud khi mở HubPage; các thay đổi sau đó được lưu bởi effect riêng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hubCloudReady) return;

    const timeout = window.setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) return;

      setHubCloudStatus("Đang lưu Hub cloud...");

      const { error } = await supabase.from("money_diary_state").upsert({
        user_id: userId,
        hub_entries: entries,
        hub_settings: settings,
        hub_change_logs: changeLogs.slice(0, 200),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(error);
        setHubCloudStatus(
          isMissingHubCloudColumn(error)
            ? "Cloud chưa có cột Hub. Hãy chạy migration để đồng bộ Hub."
            : "Lỗi lưu Hub cloud"
        );
        return;
      }

      setHubCloudStatus("Hub đã đồng bộ cloud");
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [changeLogs, entries, hubCloudReady, settings]);

  useEffect(() => {
    const legacyEntries = entries.filter((entry) => {
      return entry.diaryIncomeAmount === undefined;
    });

    if (legacyEntries.length === 0) return;

    const migrationByDate = new Map<
      string,
      { previousIncome: number; nextIncome: number }
    >();

    for (const entry of legacyEntries) {
      const income = calculateHubIncome(entry, settings);
      const current = migrationByDate.get(entry.date) ?? {
        previousIncome: 0,
        nextIncome: 0,
      };

      migrationByDate.set(entry.date, {
        previousIncome: current.previousIncome + income.total,
        nextIncome: current.nextIncome + income.workIncome,
      });
    }

    for (const [date, migration] of migrationByDate) {
      onMigrateLegacyDiaryIncome?.(
        date,
        migration.previousIncome,
        migration.nextIncome
      );
    }

    queueMicrotask(() => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.diaryIncomeAmount !== undefined) return entry;

          const contribution = createHubDiaryContribution(entry, settings);

          return {
            ...entry,
            diaryIncomeAmount: contribution.income,
            diaryOrderCount: contribution.orderCount,
            diaryWorkHours: contribution.workHours,
          };
        })
      );
    });
  }, [entries, onMigrateLegacyDiaryIncome, settings]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const listDateRange = useMemo(() => {
    if (listTimeFilter === "custom") {
      return {
        fromDate: listCustomFromDate,
        toDate: listCustomToDate,
      };
    }

    return getDateRangeForFilter(listTimeFilter, getToday());
  }, [listCustomFromDate, listCustomToDate, listTimeFilter]);

  const filteredHubEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      const matchHubType =
        listHubTypeFilter === "ALL" || entry.hubType === listHubTypeFilter;
      const matchFromDate =
        !listDateRange.fromDate || entry.date >= listDateRange.fromDate;
      const matchToDate =
        !listDateRange.toDate || entry.date <= listDateRange.toDate;

      return matchHubType && matchFromDate && matchToDate;
    });
  }, [listDateRange, listHubTypeFilter, sortedEntries]);

  const hubChangeLogTotalPages = Math.max(
    1,
    Math.ceil(changeLogs.length / HUB_CHANGE_LOG_PAGE_SIZE)
  );
  const safeHubChangeLogPage = Math.min(
    hubChangeLogPage,
    hubChangeLogTotalPages
  );
  const paginatedHubChangeLogs = useMemo(() => {
    const startIndex = (safeHubChangeLogPage - 1) * HUB_CHANGE_LOG_PAGE_SIZE;

    return changeLogs.slice(
      startIndex,
      startIndex + HUB_CHANGE_LOG_PAGE_SIZE
    );
  }, [changeLogs, safeHubChangeLogPage]);

  const markedCalendarDates = useMemo(() => {
    return new Set(
      entries
        .filter((entry) => {
          return (
            listHubTypeFilter === "ALL" || entry.hubType === listHubTypeFilter
          );
        })
        .map((entry) => entry.date)
    );
  }, [entries, listHubTypeFilter]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(listCalendarMonth, markedCalendarDates);
  }, [listCalendarMonth, markedCalendarDates]);

  function isDateSelectedOnCalendar(date: string) {
    if (listDateRange.fromDate && date < listDateRange.fromDate) return false;
    if (listDateRange.toDate && date > listDateRange.toDate) return false;

    return Boolean(listDateRange.fromDate || listDateRange.toDate);
  }

  const totalHubIncome = useMemo(() => {
    return entries.reduce((sum, entry) => {
      return sum + calculateHubIncome(entry, settings).total;
    }, 0);
  }, [entries, settings]);

  const calculatorRows = useMemo(() => {
    return entries
      .filter((entry) => entry.date === calculatorForm.date)
      .map((entry) => ({
        entry,
        income: calculateHubIncome(entry, settings),
      }));
  }, [calculatorForm.date, entries, settings]);

  const calculatorTotals = useMemo(() => {
    const totalIncome = calculatorRows.reduce((sum, row) => {
      return sum + row.income.total;
    }, 0);
    const excludedExtraIncome = calculatorRows.reduce((sum, row) => {
      return sum + row.income.extraIncome;
    }, 0);
    const excludedJoinReward = calculatorRows.reduce((sum, row) => {
      return sum + row.income.extraJoinOrderReward;
    }, 0);
    const excludedSundayReward = calculatorRows.reduce((sum, row) => {
      return sum + row.income.sundayReward;
    }, 0);
    const excludedRegionReward = calculatorRows.reduce((sum, row) => {
      return sum + row.income.weekdayRegionReward;
    }, 0);
    const excludedTotal =
      excludedExtraIncome +
      excludedJoinReward +
      excludedSundayReward +
      excludedRegionReward;
    const eligibleIncome = totalIncome - excludedTotal;
    const negativeWallet = parseSignedMoneyInput(
      calculatorForm.negativeWallet
    );
    const target = parseSignedMoneyInput(calculatorForm.target);
    const walletDebt = Math.abs(negativeWallet);
    const afterWalletDebt = eligibleIncome - walletDebt;
    const remainingToTarget = Math.max(target - afterWalletDebt, 0);
    const overTarget = Math.max(afterWalletDebt - target, 0);

    return {
      totalIncome,
      excludedExtraIncome,
      excludedJoinReward,
      excludedSundayReward,
      excludedRegionReward,
      excludedTotal,
      eligibleIncome,
      negativeWallet,
      walletDebt,
      target,
      afterWalletDebt,
      remainingToTarget,
      overTarget,
    };
  }, [calculatorForm.negativeWallet, calculatorForm.target, calculatorRows]);

  const previewEntry = useMemo<HubEntry>(() => {
    return {
      id: "preview",
      date: form.date || getToday(),
      hubType: form.hubType,
      shiftName: form.shiftName,
      order: parseMoneyInput(form.order),
      joins: toHubJoins(form.joins),
      isWellDone: form.isWellDone,
      isHubShort: form.isHubShort,
      extraIncome: parseMoneyInput(form.extraIncome),
      note: form.note.trim(),
      createdAt: new Date().toISOString(),
    };
  }, [form]);

  const previewIncome = useMemo(() => {
    return calculateHubIncome(previewEntry, settings);
  }, [previewEntry, settings]);
  const hubRows = useMemo(
    () => buildHubAnalyticsRows(entries, settings),
    [entries, settings]
  );
  const todayRange = useMemo(() => {
    const today = getToday();
    return { fromDate: today, toDate: today };
  }, []);
  const thisWeekRange = useMemo(() => getWeekRangeFromDate(getToday()), []);
  const previousWeekRange = useMemo(
    () => getWeekRangeFromDate(getToday(), -1),
    []
  );
  const thisMonthRange = useMemo(() => getMonthRangeFromDate(getToday()), []);
  const previousMonthRange = useMemo(
    () => getMonthRangeFromDate(getToday(), -1),
    []
  );
  const todayHubSummary = useMemo(
    () =>
      summarizeHubRows(
        filterHubRowsByDate(hubRows, todayRange.fromDate, todayRange.toDate)
      ),
    [hubRows, todayRange]
  );
  const weekHubSummary = useMemo(
    () =>
      summarizeHubRows(
        filterHubRowsByDate(
          hubRows,
          thisWeekRange.fromDate,
          thisWeekRange.toDate
        )
      ),
    [hubRows, thisWeekRange]
  );
  const monthHubSummary = useMemo(
    () =>
      summarizeHubRows(
        filterHubRowsByDate(
          hubRows,
          thisMonthRange.fromDate,
          thisMonthRange.toDate
        )
      ),
    [hubRows, thisMonthRange]
  );
  const statisticsDateRange = useMemo(() => {
    if (statisticsRange === "custom") {
      return {
        fromDate: statisticsCustomFromDate,
        toDate: statisticsCustomToDate,
      };
    }

    return getStatisticsDateRange(statisticsRange, getToday());
  }, [statisticsCustomFromDate, statisticsCustomToDate, statisticsRange]);
  const statisticsHubRows = useMemo(() => {
    return hubRows.filter((row) => {
      return (
        statisticsHubFilter === "ALL" ||
        row.entry.hubType === statisticsHubFilter
      );
    });
  }, [hubRows, statisticsHubFilter]);
  const statisticsRows = useMemo(
    () =>
      filterHubRowsByDate(
        statisticsHubRows,
        statisticsDateRange.fromDate,
        statisticsDateRange.toDate
      ),
    [statisticsDateRange, statisticsHubRows]
  );
  const statisticsSummary = useMemo(
    () => summarizeHubRows(statisticsRows),
    [statisticsRows]
  );
  const statisticsHubPerformance = useMemo(
    () => groupHubPerformance(statisticsRows, "hub", "workIncome"),
    [statisticsRows]
  );
  const statisticsShiftPerformance = useMemo(
    () => groupHubPerformance(statisticsRows, "shift"),
    [statisticsRows]
  );
  const statisticsLowPerformanceShifts = useMemo(() => {
    const average = statisticsSummary.incomePerHour;
    if (average <= 0) return [];

    return statisticsShiftPerformance
      .filter((item) => item.shifts >= 2 && item.incomePerHour < average * 0.75)
      .slice(0, 5);
  }, [statisticsShiftPerformance, statisticsSummary.incomePerHour]);
  const weeklyHubReport = useMemo(
    () =>
      buildHubReport({
        title: "Tổng kết tuần này",
        rows: statisticsHubRows,
        expenses,
        fromDate: thisWeekRange.fromDate,
        toDate: thisWeekRange.toDate,
        previousFromDate: previousWeekRange.fromDate,
        previousToDate: previousWeekRange.toDate,
      }),
    [expenses, previousWeekRange, statisticsHubRows, thisWeekRange]
  );
  const monthlyHubReport = useMemo(
    () =>
      buildHubReport({
        title: "Tổng kết tháng này",
        rows: statisticsHubRows,
        expenses,
        fromDate: thisMonthRange.fromDate,
        toDate: thisMonthRange.toDate,
        previousFromDate: previousMonthRange.fromDate,
        previousToDate: previousMonthRange.toDate,
      }),
    [expenses, previousMonthRange, statisticsHubRows, thisMonthRange]
  );
  const totalOrderCount = parseMoneyInput(form.order);
  const joinedOrderCount = getJoinChildOrderCount(toHubJoins(form.joins));
  const remainingSingleOrderCount = Math.max(
    totalOrderCount - joinedOrderCount,
    0
  );
  const canSaveShift =
    Boolean(form.date) &&
    (totalOrderCount > 0 || form.joins.length > 0) &&
    joinedOrderCount <= totalOrderCount;
  const currentShiftHours = getShiftHours(form.shiftName);

  function canUseJoinType(type: number) {
    return remainingSingleOrderCount >= type;
  }

  function addJoinRow(type = 2) {
    if (!canUseJoinType(type)) return;

    setForm((prev) => ({
      ...prev,
      joins: [
        ...prev.joins,
        createJoinForm(type, getDefaultJoinPrice(type, settings)),
      ],
    }));
  }

  function updateJoinRow(id: string, nextRow: Partial<HubJoinForm>) {
    setForm((prev) => ({
      ...prev,
      joins: prev.joins.map((row) =>
        row.id === id ? { ...row, ...nextRow } : row
      ),
    }));
  }

  function deleteJoinRow(id: string) {
    setForm((prev) => ({
      ...prev,
      joins: prev.joins.filter((row) => row.id !== id),
    }));
  }

  function saveHubEntry() {
    const order = parseMoneyInput(form.order);
    const extraIncome = parseMoneyInput(form.extraIncome);
    const receivedMoney = parseMoneyInput(form.receivedMoney);
    const bonusMoney = parseMoneyInput(form.bonusMoney);
    const joins = toHubJoins(form.joins);

    if (!form.date) {
      alert("Bạn chưa chọn ngày.");
      return;
    }

    if (order <= 0 && joins.length === 0) {
      alert("Bạn cần nhập tổng số đơn hoặc ít nhất một lượt ghép.");
      return;
    }

    const joinedOrderCount = getJoinChildOrderCount(joins);
    if (joinedOrderCount > order) {
      alert(
        `Đơn đã dùng cho đơn ghép (${joinedOrderCount}) đang lớn hơn tổng số đơn trong ca (${order}).`
      );
      return;
    }

    const existingEntry = editingHubEntryId
      ? entries.find((entry) => entry.id === editingHubEntryId)
      : undefined;
    const now = new Date().toISOString();
    const newEntry: HubEntry = {
      id: existingEntry?.id ?? crypto.randomUUID(),
      date: form.date,
      hubType: form.hubType,
      shiftName: form.shiftName,
      order,
      joins,
      isWellDone: form.isWellDone,
      isHubShort: form.isHubShort,
      extraIncome,
      note: form.note.trim(),
      createdAt: existingEntry?.createdAt ?? now,
      updatedAt: now,
    };
    const nextContribution = createHubDiaryContribution(newEntry, settings);
    const savedEntry: HubEntry = {
      ...newEntry,
      diaryIncomeAmount: nextContribution.income,
      diaryOrderCount: nextContribution.orderCount,
      diaryWorkHours: nextContribution.workHours,
    };

    if (editingHubEntryId) {
      const previousContribution = existingEntry
        ? getHubDiaryContribution(existingEntry, settings)
        : null;

      setEntries((prev) =>
        prev.map((entry) => (entry.id === editingHubEntryId ? savedEntry : entry))
      );
      setChangeLogs((prev) => [
        createHubChangeLog({
          action: "update",
          previousEntry: existingEntry,
          nextEntry: savedEntry,
        }),
        ...prev,
      ]);
      onAdjustDiaryContribution?.(previousContribution, nextContribution);
    } else {
      setEntries((prev) => [savedEntry, ...prev]);
      setChangeLogs((prev) => [
        createHubChangeLog({
          action: "create",
          nextEntry: savedEntry,
        }),
        ...prev,
      ]);

      onSaveToDiary?.(savedEntry.date, nextContribution.income, {
        receivedMoney,
        bonusMoney,
        mood: form.mood,
        diary: form.diary.trim(),
        note: form.note.trim(),
        orderCount: nextContribution.orderCount,
        workHours: nextContribution.workHours,
      });
    }

    setForm(createForm());
    setEditingHubEntryId(null);
    setShowIncomeDetails(false);
    setTab("list");
    alert(
      editingHubEntryId
        ? "Đã cập nhật ca hub thành công."
        : "Đã thêm ca hub và nhật kí thành công."
    );
  }

  function handleSaveHubEntry() {
    if (saveShiftLockRef.current) return;

    saveShiftLockRef.current = true;
    setIsSavingShift(true);

    try {
      saveHubEntry();
    } finally {
      window.setTimeout(() => {
        saveShiftLockRef.current = false;
        setIsSavingShift(false);
      }, 300);
    }
  }

  function deleteHubEntry(id: string, deletionLog?: HubChangeLog) {
    const entryToDelete = entries.find((entry) => entry.id === id);

    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setExpandedShiftIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    if (entryToDelete) {
      setChangeLogs((prev) => [
        deletionLog ??
          createHubChangeLog({
            action: "delete",
            previousEntry: entryToDelete,
          }),
        ...prev,
      ]);
      onAdjustDiaryContribution?.(
        getHubDiaryContribution(entryToDelete, settings),
        null
      );
    }

    if (editingHubEntryId === id) {
      setEditingHubEntryId(null);
      setForm(createForm());
    }
  }

  function toggleShiftDetails(id: string) {
    setExpandedShiftIds((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  function requestDeleteShift(entry: HubEntry) {
    setDeleteShiftError("");
    setPendingDeleteEntry(entry);
  }

  async function confirmDeleteShift() {
    if (!pendingDeleteEntry || isDeletingShift) return;

    const entryToDelete = pendingDeleteEntry;
    const deletionLog = createHubChangeLog({
      action: "delete",
      previousEntry: entryToDelete,
    });
    const nextEntries = entries.filter((entry) => entry.id !== entryToDelete.id);
    const nextChangeLogs = [deletionLog, ...changeLogs].slice(0, 200);

    setIsDeletingShift(true);
    setDeleteShiftError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (hubCloudReady && userId) {
        setHubCloudStatus("Đang xóa ca trên Hub cloud...");
        const { error } = await supabase.from("money_diary_state").upsert({
          user_id: userId,
          hub_entries: nextEntries,
          hub_settings: settings,
          hub_change_logs: nextChangeLogs,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        setHubCloudStatus("Hub đã đồng bộ cloud");
      }

      deleteHubEntry(entryToDelete.id, deletionLog);
      setPendingDeleteEntry(null);
    } catch (error) {
      console.error(error);
      setHubCloudStatus("Lỗi lưu Hub cloud");
      setDeleteShiftError(
        "Không thể xóa ca lúc này. Dữ liệu vẫn được giữ nguyên, hãy thử lại."
      );
    } finally {
      setIsDeletingShift(false);
    }
  }

  function editHubEntry(entry: HubEntry) {
    setForm(createFormFromEntry(entry));
    setEditingHubEntryId(entry.id);
    setShowIncomeDetails(true);
    setTab("add");
  }

  function cancelEditHubEntry() {
    setForm(createForm());
    setEditingHubEntryId(null);
    setShowIncomeDetails(false);
  }

  function restoreDeletedHubEntry(entry: HubEntry) {
    const exists = entries.some((item) => item.id === entry.id);
    if (exists) {
      alert("Ca hub này đang tồn tại, không cần khôi phục.");
      return;
    }

    const restoredEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };

    setEntries((prev) => [restoredEntry, ...prev]);
    setChangeLogs((prev) => [
      createHubChangeLog({
        action: "restore",
        nextEntry: restoredEntry,
      }),
      ...prev,
    ]);
    onAdjustDiaryContribution?.(
      null,
      getHubDiaryContribution(restoredEntry, settings)
    );
    alert("Đã khôi phục ca hub.");
  }

  function undoHubChange(log: HubChangeLog) {
    if (log.action === "create" && log.nextEntry) {
      setEntries((prev) => prev.filter((entry) => entry.id !== log.entryId));
      onAdjustDiaryContribution?.(
        getHubDiaryContribution(log.nextEntry, settings),
        null
      );
      alert("Đã hoàn tác ca vừa thêm.");
      return;
    }

    if (log.action === "delete" && log.previousEntry) {
      restoreDeletedHubEntry(log.previousEntry);
      return;
    }

    if (log.action === "update" && log.previousEntry && log.nextEntry) {
      const revertedEntry = {
        ...log.previousEntry,
        updatedAt: new Date().toISOString(),
      };

      setEntries((prev) =>
        prev.map((entry) => (entry.id === log.entryId ? revertedEntry : entry))
      );
      setChangeLogs((prev) => [
        createHubChangeLog({
          action: "restore",
          previousEntry: log.nextEntry,
          nextEntry: revertedEntry,
        }),
        ...prev,
      ]);
      onAdjustDiaryContribution?.(
        getHubDiaryContribution(log.nextEntry, settings),
        getHubDiaryContribution(revertedEntry, settings)
      );
      alert("Đã hoàn tác lần cập nhật ca hub.");
      return;
    }

    alert("Thay đổi này không thể hoàn tác tự động.");
  }

  function selectListTimeFilter(nextFilter: HubTimeFilter) {
    setListTimeFilter(nextFilter);

    if (nextFilter === "custom") {
      setListCalendarMonth((listCustomFromDate || getToday()).slice(0, 7));
      return;
    }

    const range = getDateRangeForFilter(nextFilter, getToday());
    setListCalendarMonth((range.fromDate || getToday()).slice(0, 7));
  }

  function selectCalendarDate(date: string) {
    setListTimeFilter("custom");
    setListCustomFromDate(date);
    setListCustomToDate(date);
    setListCalendarMonth(date.slice(0, 7));
  }

  function changeCalendarMonth(amount: number) {
    setListCalendarMonth((prev) => addMonths(prev, amount));
  }

  return (
    <div className="hub-work-page">
      <HubWorkHeader date={form.date} isEditing={Boolean(editingHubEntryId)} />

      <HubNavigation activeTab={tab} onChange={setTab} />

      <HubDailySummary
        todayIncome={formatMoney(todayHubSummary.workIncome)}
        totalGross={formatMoney(totalHubIncome)}
        cloudStatus={hubCloudStatus}
      />

      {tab === "add" && (
        <section className="hub-add-layout" aria-label="Thêm ca Hub và nhật ký">
          <div className="hub-add-layout__main">
            <WorkShiftSection
              form={form}
              setForm={setForm}
              settings={settings}
              remainingSingleOrders={remainingSingleOrderCount}
              joinedOrders={joinedOrderCount}
            />
            <MatchedOrderSection
              joins={form.joins}
              remainingSingleOrders={remainingSingleOrderCount}
              canUseJoinType={canUseJoinType}
              onAdd={addJoinRow}
              onUpdate={updateJoinRow}
              onDelete={deleteJoinRow}
            />
            <OtherIncomeSection value={form.extraIncome} setForm={setForm} />
          </div>

          <aside className="hub-add-layout__sidebar">
            <DailyJournalSection
              form={form}
              setForm={setForm}
              isEditing={Boolean(editingHubEntryId)}
            />
            <ShiftSummaryCard
              income={previewIncome}
              hubType={form.hubType}
              orderCount={totalOrderCount}
              workHours={currentShiftHours}
              showDetails={showIncomeDetails}
              onToggleDetails={() => setShowIncomeDetails((current) => !current)}
            />
            <SaveShiftActionBar
              isEditing={Boolean(editingHubEntryId)}
              isSaving={isSavingShift}
              canSave={canSaveShift}
              onSave={handleSaveHubEntry}
              onCancel={cancelEditHubEntry}
            />
          </aside>
        </section>
      )}

      {tab === "calculator" && (
        <CalculatorPage
          form={calculatorForm}
          totals={calculatorTotals}
          rows={calculatorRows}
          settings={settings}
          onDateChange={(date) =>
            setCalculatorForm((current) => ({ ...current, date }))
          }
          onNegativeWalletChange={(value) =>
            setCalculatorForm((current) => ({
              ...current,
              negativeWallet: formatSignedMoneyInput(value),
            }))
          }
          onTargetChange={(value) =>
            setCalculatorForm((current) => ({
              ...current,
              target: formatSignedMoneyInput(value),
            }))
          }
          onApplyToNewShift={() => {
            setForm((current) => ({ ...current, date: calculatorForm.date }));
            setTab("add");
          }}
          onReset={() => setCalculatorForm(createCalculatorForm())}
        />
      )}
      {tab === "dashboard" && (
        <HubStatisticsPage
          range={statisticsRange}
          hubFilter={statisticsHubFilter}
          customFromDate={statisticsCustomFromDate}
          customToDate={statisticsCustomToDate}
          rangeLabel={getRangeLabel(
            statisticsDateRange.fromDate,
            statisticsDateRange.toDate
          )}
          summary={statisticsSummary}
          todaySummary={todayHubSummary}
          weekSummary={weekHubSummary}
          monthSummary={monthHubSummary}
          hubPerformance={statisticsHubPerformance}
          shiftPerformance={statisticsShiftPerformance}
          lowPerformanceShifts={statisticsLowPerformanceShifts}
          weeklyReport={weeklyHubReport}
          monthlyReport={monthlyHubReport}
          changeLogs={paginatedHubChangeLogs}
          currentLogPage={safeHubChangeLogPage}
          totalLogPages={hubChangeLogTotalPages}
          pageSize={HUB_CHANGE_LOG_PAGE_SIZE}
          onRangeChange={setStatisticsRange}
          onHubFilterChange={setStatisticsHubFilter}
          onCustomFromDateChange={setStatisticsCustomFromDate}
          onCustomToDateChange={setStatisticsCustomToDate}
          onOpenShifts={() => setTab("list")}
          onUndoChange={undoHubChange}
          onRestoreChange={restoreDeletedHubEntry}
          onLogPageChange={setHubChangeLogPage}
        />
      )}
      {tab === "list" && (
        <MyShiftsPage
          entries={filteredHubEntries}
          settings={settings}
          expandedShiftIds={expandedShiftIds}
          hubTypeFilter={listHubTypeFilter}
          timeFilter={listTimeFilter}
          customFromDate={listCustomFromDate}
          customToDate={listCustomToDate}
          calendarMonth={listCalendarMonth}
          calendarDays={calendarDays}
          rangeLabel={getRangeLabel(listDateRange.fromDate, listDateRange.toDate)}
          onAdd={() => setTab("add")}
          onEdit={editHubEntry}
          onRequestDelete={requestDeleteShift}
          onToggle={toggleShiftDetails}
          onHubTypeFilterChange={setListHubTypeFilter}
          onTimeFilterChange={selectListTimeFilter}
          onCustomFromDateChange={(value) => {
            setListCustomFromDate(value);
            setListTimeFilter("custom");
            if (value) setListCalendarMonth(value.slice(0, 7));
          }}
          onCustomToDateChange={(value) => {
            setListCustomToDate(value);
            setListTimeFilter("custom");
            if (value) setListCalendarMonth(value.slice(0, 7));
          }}
          onSelectDate={selectCalendarDate}
          onCalendarMonthChange={changeCalendarMonth}
          isDateSelected={isDateSelectedOnCalendar}
          getDurationHours={getShiftHours}
        />
      )}
      {tab === "settings" && (
        <HubSettingsPage
          settings={settings}
          cloudStatus={hubCloudStatus}
          onChange={setSettings}
        />
      )}

      <DeleteShiftDialog
        entry={pendingDeleteEntry}
        error={deleteShiftError}
        isDeleting={isDeletingShift}
        onCancel={() => {
          if (!isDeletingShift) {
            setPendingDeleteEntry(null);
            setDeleteShiftError("");
          }
        }}
        onConfirm={confirmDeleteShift}
      />
    </div>
  );
}
