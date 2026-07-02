import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HUB_SETTINGS,
  DEFAULT_JOIN_PRICES,
  HUB_SHIFT_OPTIONS_BY_TYPE,
  HUB_TYPE_LABEL,
  HUB_TYPES,
  STORAGE_HUB_CALCULATOR_KEY,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "../constants/hanoiHub";
import { getDateString, getToday, toDate } from "../utils/date";
import { calculateHubIncome } from "../utils/hubIncome";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/money";
import type { Mood } from "../types";
import type { HubEntry, HubJoinOrder, HubSettings, HubType } from "../types/hub";

type HubTab = "add" | "calculator" | "list" | "settings";
type HubTypeFilter = "ALL" | HubType;
type HubTimeFilter =
  | "last3"
  | "today"
  | "previousWeek"
  | "thisWeek"
  | "thisMonth"
  | "previousMonth"
  | "custom";

type HubJoinForm = {
  id: string;
  type: string;
  quantity: string;
  price: string;
};

type HubForm = {
  date: string;
  hubType: HubType;
  shiftName: string;
  order: string;
  joins: HubJoinForm[];
  isWellDone: boolean;
  isHubShort: boolean;
  extraIncome: string;
  receivedMoney: string;
  bonusMoney: string;
  mood: Mood;
  diary: string;
  note: string;
};

type HubCalculatorForm = {
  date: string;
  negativeWallet: string;
  target: string;
};

export type HubDiaryPayload = {
  receivedMoney: number;
  bonusMoney: number;
  mood: Mood;
  diary: string;
  note: string;
  orderCount: number;
  workHours: number;
};

const QUICK_JOIN_TYPES = [2, 3, 4, 5];
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HUB_TIME_FILTERS: Array<{ label: string; value: HubTimeFilter }> = [
  { label: "3 ngày gần nhất", value: "last3" },
  { label: "Hôm nay", value: "today" },
  { label: "Tuần trước", value: "previousWeek" },
  { label: "Tuần này", value: "thisWeek" },
  { label: "Tháng này", value: "thisMonth" },
  { label: "Tháng trước", value: "previousMonth" },
  { label: "Tùy chỉnh", value: "custom" },
];

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

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
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

  return Math.round((duration / 60) * 100) / 100;
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

type HubPageProps = {
  onBackHome?: () => void;
  onSaveToDiary?: (
    date: string,
    amount: number,
    diaryPayload: HubDiaryPayload
  ) => void;
};

export function HubPage({ onBackHome, onSaveToDiary }: HubPageProps) {
  const [tab, setTab] = useState<HubTab>("add");
  const [entries, setEntries] = useState<HubEntry[]>(() =>
    loadJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, [])
  );
  const [settings, setSettings] = useState<HubSettings>(() => ({
    ...DEFAULT_HUB_SETTINGS,
    ...loadJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {}),
  }));
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
  const [showIncomeDetails, setShowIncomeDetails] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_HUB_ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HUB_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_HUB_CALCULATOR_KEY,
      JSON.stringify(calculatorForm)
    );
  }, [calculatorForm]);

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

  const filteredHubSummary = useMemo(() => {
    return filteredHubEntries.reduce(
      (summary, entry) => {
        const income = calculateHubIncome(entry, settings);

        return {
          income: summary.income + income.total,
          orders: summary.orders + entry.order,
          joins: summary.joins + income.totalJoinChildOrders,
        };
      },
      { income: 0, orders: 0, joins: 0 }
    );
  }, [filteredHubEntries, settings]);

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

  const todayHubIncome = useMemo(() => {
    return entries
      .filter((entry) => entry.date === getToday())
      .reduce((sum, entry) => {
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
  const currentShiftOptions = HUB_SHIFT_OPTIONS_BY_TYPE[form.hubType];
  const totalOrderCount = parseMoneyInput(form.order);
  const joinedOrderCount = getJoinChildOrderCount(toHubJoins(form.joins));
  const remainingSingleOrderCount = Math.max(
    totalOrderCount - joinedOrderCount,
    0
  );

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
      alert("Bạn cần nhập tổng số đơn hoặc ít nhất một dòng đơn ghép.");
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
    const income = calculateHubIncome(newEntry, settings);

    if (editingHubEntryId) {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === editingHubEntryId ? newEntry : entry))
      );
    } else {
      setEntries((prev) => [newEntry, ...prev]);

      onSaveToDiary?.(newEntry.date, income.total, {
        receivedMoney,
        bonusMoney,
        mood: form.mood,
        diary: form.diary.trim(),
        note: form.note.trim(),
        orderCount: order,
        workHours: getShiftHours(form.shiftName),
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

  function deleteHubEntry(id: string) {
    const confirmed = confirm("Xóa ca hub này?");
    if (!confirmed) return;

    // TODO: Khi cần chính xác tuyệt đối, trừ lại thu nhập hub khỏi DailyEntry tương ứng.
    setEntries((prev) => prev.filter((entry) => entry.id !== id));

    if (editingHubEntryId === id) {
      setEditingHubEntryId(null);
      setForm(createForm());
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
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Hub / Ca làm</h2>
          <p className="text-sm text-slate-500">
            Tính tiền ca hub theo logic Hà Nội.
          </p>
        </div>

        {onBackHome && (
          <button
            type="button"
            onClick={onBackHome}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-slate-100"
          >
            Về trang chủ
          </button>
        )}
      </div>

      <section className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm md:grid-cols-4">
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          Thêm ca hub và nhật kí
        </TabButton>
        <TabButton
          active={tab === "calculator"}
          onClick={() => setTab("calculator")}
        >
          Máy tính
        </TabButton>
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          Hub của tôi
        </TabButton>
        <TabButton
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          Cài đặt
        </TabButton>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <SummaryCard label="Tiền hub hôm nay" value={formatMoney(todayHubIncome)} />
        <SummaryCard
          label="Tổng tiền hub đã lưu"
          value={formatMoney(totalHubIncome)}
        />
      </section>

      {tab === "add" && (
        <section className="grid gap-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold">
                {editingHubEntryId ? "Cập nhật ca hub" : "Thêm ca hub và nhật kí"}
              </h3>

              {editingHubEntryId && (
                <button
                  type="button"
                  onClick={cancelEditHubEntry}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-bold hover:bg-slate-100"
                >
                  Hủy cập nhật
                </button>
              )}
            </div>

            <FormBlock title="Hiệu suất ca HUB">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <ChoiceButton
                  active={form.isWellDone}
                  onClick={() => setForm((prev) => ({ ...prev, isWellDone: true }))}
                >
                  Đạt
                </ChoiceButton>
                <ChoiceButton
                  active={!form.isWellDone}
                  onClick={() => setForm((prev) => ({ ...prev, isWellDone: false }))}
                >
                  Không đạt
                </ChoiceButton>
              </div>
            </FormBlock>

            <FormBlock title="Loại HUB">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {HUB_TYPES.map((hubType) => (
                  <ChoiceButton
                    key={hubType}
                    active={form.hubType === hubType}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        hubType,
                        shiftName: HUB_SHIFT_OPTIONS_BY_TYPE[hubType][0],
                      }))
                    }
                  >
                    {HUB_TYPE_LABEL[hubType]}
                  </ChoiceButton>
                ))}
              </div>
            </FormBlock>

            <FormBlock title="Ngày làm việc">
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
              />
            </FormBlock>

            <FormBlock title="Khung giờ">
              <select
                value={form.shiftName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, shiftName: event.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
              >
                {currentShiftOptions.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </FormBlock>

            <FormBlock title="Tổng đơn trong ca">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Tổng số đơn</label>
                  <input
                    inputMode="numeric"
                    value={form.order}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        order: formatMoneyInput(event.target.value),
                      }))
                    }
                    placeholder="VD: 25"
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Còn {remainingSingleOrderCount} đơn lẻ sau khi chuyển{" "}
                    {joinedOrderCount} đơn sang ghép.
                  </p>
                </div>

                <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.isHubShort}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isHubShort: event.target.checked,
                      }))
                    }
                  />
                  Dùng giá hub ngắn {formatMoney(settings.hubShortPrice)} / đơn
                </label>
              </div>
            </FormBlock>

            <FormBlock title="Đơn ghép trong ca">
              <div className="flex flex-wrap gap-2">
                {QUICK_JOIN_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addJoinRow(type)}
                    disabled={!canUseJoinType(type)}
                    title={
                      canUseJoinType(type)
                        ? undefined
                        : `Cần còn ít nhất ${type} đơn lẻ để thêm ghép ${type}`
                    }
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      canUseJoinType(type)
                        ? "bg-slate-100 hover:bg-slate-200"
                        : "cursor-not-allowed bg-slate-100 text-slate-400 opacity-50"
                    }`}
                  >
                    + Ghép {type}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addJoinRow()}
                  disabled={!canUseJoinType(2)}
                  title={
                    canUseJoinType(2)
                      ? undefined
                      : "Cần còn ít nhất 2 đơn lẻ để thêm đơn ghép"
                  }
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    canUseJoinType(2)
                      ? "bg-slate-900 text-white hover:bg-slate-700"
                      : "cursor-not-allowed bg-slate-300 text-slate-500"
                  }`}
                >
                  Thêm loại đơn ghép
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                {form.joins.length === 0 ? (
                  <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500">
                    Chưa có dòng đơn ghép nào.
                  </p>
                ) : (
                  form.joins.map((row) => (
                    <div
                      key={row.id}
                      className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1.3fr_auto]"
                    >
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Loại ghép
                        </label>
                        <input
                          inputMode="numeric"
                          value={row.type}
                          onChange={(event) =>
                            updateJoinRow(row.id, {
                              type: event.target.value.replace(/[^\d]/g, ""),
                            })
                          }
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Số lượng
                        </label>
                        <input
                          inputMode="numeric"
                          value={row.quantity}
                          onChange={(event) =>
                            updateJoinRow(row.id, {
                              quantity: formatMoneyInput(event.target.value),
                            })
                          }
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Giá tiền
                        </label>
                        <input
                          inputMode="numeric"
                          value={row.price}
                          onChange={(event) =>
                            updateJoinRow(row.id, {
                              price: formatMoneyInput(event.target.value),
                            })
                          }
                          className="mt-1 w-full rounded-xl border px-3 py-2"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => deleteJoinRow(row.id)}
                          className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </FormBlock>

            <FormBlock title="Thu nhập khác">
              <input
                inputMode="numeric"
                value={form.extraIncome}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    extraIncome: formatMoneyInput(event.target.value),
                  }))
                }
                placeholder="VD: tip, hỗ trợ, phí khác..."
                className="w-full rounded-xl border px-3 py-2"
              />
            </FormBlock>
          </div>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">
              {editingHubEntryId ? "Ghi chú ca hub" : "Nhật ký hôm nay"}
            </h3>

            {!editingHubEntryId && (
              <>
                <p className="text-sm text-slate-500">
                  Nhật ký hôm nay sẽ được lưu vào mục nhật ký chung của bạn. Bạn có thể ghi lại những gì đã xảy ra trong ca làm, cảm xúc, hoặc bất kỳ ghi chú nào bạn muốn.
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Tiền nhận được</label>
                    <input
                      inputMode="numeric"
                      value={form.receivedMoney}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          receivedMoney: formatMoneyInput(event.target.value),
                        }))
                      }
                      placeholder="VD: 500.000"
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tiền thưởng</label>
                    <input
                      inputMode="numeric"
                      value={form.bonusMoney}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          bonusMoney: formatMoneyInput(event.target.value),
                        }))
                      }
                      placeholder="VD: 100.000"
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tâm trạng</label>
                    <select
                      value={form.mood}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          mood: event.target.value as Mood,
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
                </div>

                <div className="mt-3">
                  <label className="text-sm font-medium">
                    Hôm nay mình đã làm gì?
                  </label>
                  <textarea
                    rows={4}
                    value={form.diary}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, diary: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="VD: Chạy ca tối, nhiều đơn ghép, đường đông..."
                  />
                </div>
              </>
            )}

              <div className="mt-3">
                <label className="text-sm font-medium">Ghi chú thêm</label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="VD: mưa, app lỗi, cần tối ưu khung giờ..."
                />
              </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Thống kê</h3>
                <p className="text-sm text-slate-500">
                  Tạm tính theo dữ liệu đang nhập.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowIncomeDetails((prev) => !prev)}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-slate-100"
              >
                {showIncomeDetails ? "Thu gọn" : "Xem chi tiết"}
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
              <p className="text-sm text-slate-300">Tổng thu nhập</p>
              <p className="mt-1 text-3xl font-black">
                {formatMoney(previewIncome.total)}
              </p>
            </div>

            {showIncomeDetails && (
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <IncomeStat
                  label="Thu nhập đơn lẻ còn lại"
                  value={previewIncome.singleOrderIncome}
                />
                <IncomeStat label="Thu nhập đơn ghép" value={previewIncome.joinOrderIncome} />
                <IncomeStat label="Thu nhập đơn vượt mốc" value={previewIncome.extraOrderReward} />
                <IncomeStat
                  label="Thu nhập đơn ghép vượt mốc"
                  value={previewIncome.extraJoinOrderReward}
                />
                <IncomeStat
                  label="Thưởng Chủ nhật"
                  value={previewIncome.sundayReward}
                />
                <IncomeStat
                  label="Thưởng khu vực"
                  value={previewIncome.weekdayRegionReward}
                />
                <IncomeStat label="Thu nhập khác" value={previewIncome.extraIncome} />
                <IncomeStat
                  label="Tăng/giảm do đơn ghép"
                  value={previewIncome.joinDifference}
                  signed
                />
              </div>
            )}

            <button
              type="button"
              onClick={saveHubEntry}
              className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-700"
            >
              {editingHubEntryId ? "Cập nhật ca hub" : "Lưu ca hub và nhật kí"}
            </button>
          </section>
        </section>
      )}

      {tab === "calculator" && (
        <section className="grid gap-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">Máy tính</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Ngày tính</label>
                <input
                  type="date"
                  value={calculatorForm.date}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tiền âm ví app</label>
                <input
                  inputMode="decimal"
                  value={calculatorForm.negativeWallet}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      negativeWallet: formatSignedMoneyInput(
                        event.target.value
                      ),
                    }))
                  }
                  placeholder="VD: -200.000"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Mốc cần về</label>
                <input
                  inputMode="decimal"
                  value={calculatorForm.target}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      target: formatSignedMoneyInput(event.target.value),
                    }))
                  }
                  placeholder="VD: -1.000.000"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <IncomeStat
                label="Tổng thu nhập Hub"
                value={calculatorTotals.totalIncome}
              />
              <IncomeStat
                label="Khoản loại trừ"
                value={calculatorTotals.excludedTotal}
              />
              <IncomeStat
                label="Thu nhập tính mốc"
                value={calculatorTotals.eligibleIncome}
              />
              <IncomeStat
                label="Tiền âm ví app"
                value={calculatorTotals.negativeWallet}
              />
              <IncomeStat
                label="Sau khi trừ ví âm"
                value={calculatorTotals.afterWalletDebt}
              />
              <IncomeStat label="Mốc cần về" value={calculatorTotals.target} />
              <IncomeStat
                label="Còn thiếu về mốc"
                value={calculatorTotals.remainingToTarget}
              />
              <IncomeStat
                label="Đã vượt mốc"
                value={calculatorTotals.overTarget}
              />
            </div>

            <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              <p>
                Trừ thu nhập khác:{" "}
                <strong>{formatMoney(calculatorTotals.excludedExtraIncome)}</strong>
              </p>
              <p>
                Trừ ghép vượt mốc:{" "}
                <strong>{formatMoney(calculatorTotals.excludedJoinReward)}</strong>
              </p>
              <p>
                Trừ thưởng Chủ nhật:{" "}
                <strong>{formatMoney(calculatorTotals.excludedSundayReward)}</strong>
              </p>
              <p>
                Trừ thưởng khu vực:{" "}
                <strong>{formatMoney(calculatorTotals.excludedRegionReward)}</strong>
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">Ca Hub trong ngày</h3>

            <div className="mt-4 grid gap-3">
              {calculatorRows.length === 0 ? (
                <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
                  Chưa có ca hub nào trong ngày này.
                </p>
              ) : (
                calculatorRows.map(({ entry, income }) => (
                  <article key={entry.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold">
                          {HUB_TYPE_LABEL[entry.hubType]} · {entry.shiftName}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {entry.order} tổng đơn · {income.totalJoinChildOrders} đơn ghép
                        </p>
                      </div>

                      <p className="text-lg font-black">
                        {formatMoney(income.total)}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      )}

      {tab === "list" && (
        <section className="grid gap-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Hub của tôi</h3>
                <p className="text-sm text-slate-500">
                  Lọc ca hub theo loại, thời gian hoặc chọn trực tiếp trên lịch.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTab("add")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                Thêm ca mới
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(-1)}
                    className="h-9 w-9 rounded-full bg-white text-lg font-black shadow-sm hover:bg-slate-100"
                  >
                    ‹
                  </button>
                  <h4 className="text-center font-black capitalize">
                    {formatMonthLabel(listCalendarMonth)}
                  </h4>
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(1)}
                    className="h-9 w-9 rounded-full bg-white text-lg font-black shadow-sm hover:bg-slate-100"
                  >
                    ›
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const isSelected = isDateSelectedOnCalendar(day.date);
                    const isToday = day.date === getToday();

                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => selectCalendarDate(day.date)}
                        className={`relative aspect-square rounded-xl text-sm font-bold ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : day.isCurrentMonth
                              ? "bg-white text-slate-900 hover:bg-slate-100"
                              : "bg-transparent text-slate-300 hover:bg-white"
                        } ${isToday && !isSelected ? "ring-2 ring-slate-300" : ""}`}
                      >
                        {day.day}
                        {day.hasEntry && (
                          <span
                            className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                              isSelected ? "bg-white" : "bg-emerald-500"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid content-start gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Lọc theo loại
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["ALL", ...HUB_TYPES] as HubTypeFilter[]).map(
                      (hubType) => (
                        <button
                          key={hubType}
                          type="button"
                          onClick={() => setListHubTypeFilter(hubType)}
                          className={`rounded-xl px-3 py-2 text-sm font-bold ${
                            listHubTypeFilter === hubType
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 hover:bg-slate-200"
                          }`}
                        >
                          {hubType === "ALL" ? "Tất cả" : HUB_TYPE_LABEL[hubType]}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Lọc theo thời gian
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {HUB_TIME_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => selectListTimeFilter(filter.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-bold ${
                          listTimeFilter === filter.value
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 hover:bg-slate-200"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {listTimeFilter === "custom" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Từ ngày</label>
                      <input
                        type="date"
                        value={listCustomFromDate}
                        onChange={(event) => {
                          setListCustomFromDate(event.target.value);
                          setListTimeFilter("custom");
                          if (event.target.value) {
                            setListCalendarMonth(event.target.value.slice(0, 7));
                          }
                        }}
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Đến ngày</label>
                      <input
                        type="date"
                        value={listCustomToDate}
                        onChange={(event) => {
                          setListCustomToDate(event.target.value);
                          setListTimeFilter("custom");
                          if (event.target.value) {
                            setListCalendarMonth(event.target.value.slice(0, 7));
                          }
                        }}
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                <p className="rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-600">
                  Bạn đang xem dữ liệu {getRangeLabel(
                    listDateRange.fromDate,
                    listDateRange.toDate
                  )}{" "}
                  ·{" "}
                  {listHubTypeFilter === "ALL"
                    ? "tất cả hub"
                    : HUB_TYPE_LABEL[listHubTypeFilter]}
                  .
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <SummaryCard
              label="Số ca đang xem"
              value={`${filteredHubEntries.length} ca`}
            />
            <SummaryCard
              label="Tổng tiền đang xem"
              value={formatMoney(filteredHubSummary.income)}
            />
            <SummaryCard
              label="Tổng đơn đang xem"
              value={`${filteredHubSummary.orders} đơn`}
            />
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold">Kết quả lọc</h3>
              <p className="text-sm font-medium text-slate-500">
                {filteredHubSummary.joins} đơn đã ghép
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {filteredHubEntries.length === 0 ? (
                <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
                  Không có ca hub nào trong bộ lọc này.
                </p>
              ) : (
                filteredHubEntries.map((entry) => {
                  const income = calculateHubIncome(entry, settings);

                  return (
                    <article key={entry.id} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold">
                            {entry.date} · {HUB_TYPE_LABEL[entry.hubType]}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {entry.shiftName || "Chưa nhập khung giờ"} · {entry.order} tổng đơn · {income.remainingSingleOrders} đơn lẻ còn lại · {income.totalJoinChildOrders} đơn đã ghép
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-slate-500">Tổng tiền</p>
                          <p className="text-xl font-black">
                            {formatMoney(income.total)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                        <p>
                          Đơn lẻ còn lại: {formatMoney(income.singleOrderIncome)}
                        </p>
                        <p>Đơn ghép: {formatMoney(income.joinOrderIncome)}</p>
                        <p>
                          Vượt mốc đơn: {formatMoney(income.extraOrderReward)}
                        </p>
                        <p>
                          Vượt mốc ghép:{" "}
                          {formatMoney(income.extraJoinOrderReward)}
                        </p>
                        <p>Thưởng Chủ nhật: {formatMoney(income.sundayReward)}</p>
                        <p>
                          Thưởng khu vực:{" "}
                          {formatMoney(income.weekdayRegionReward)}
                        </p>
                        <p>Thu nhập khác: {formatMoney(income.extraIncome)}</p>
                        <p>
                          Ghép: {income.joinDifference >= 0 ? "Tăng" : "Giảm"}{" "}
                          {formatMoney(Math.abs(income.joinDifference))}
                        </p>
                        <p>
                          Hiệu suất:{" "}
                          <strong>{entry.isWellDone ? "Đạt" : "Không đạt"}</strong>
                        </p>
                        <p>
                          Loại đơn:{" "}
                          <strong>{entry.isHubShort ? "Hub ngắn" : "Thường"}</strong>
                        </p>
                      </div>

                      {entry.joins.length > 0 && (
                        <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                          {entry.joins.map((join, index) => (
                            <p key={`${entry.id}-${index}`}>
                              Ghép {join.type}: {getJoinQuantity(join)} dòng ·{" "}
                              {formatMoney(join.price)}
                            </p>
                          ))}
                        </div>
                      )}

                      {entry.note && (
                        <p className="mt-2 text-sm text-slate-500">
                          Ghi chú: {entry.note}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editHubEntry(entry)}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700"
                        >
                          Cập nhật ca
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHubEntry(entry.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>
      )}

      {tab === "settings" && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold">Cài đặt hub</h3>
          <p className="mt-1 text-sm text-slate-500">
            Khu vực đang cố định: <strong>Hà Nội</strong>
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <SettingMoneyInput
              label="Giá đơn thường"
              value={settings.orderPrice}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, orderPrice: value }))
              }
            />
            <SettingMoneyInput
              label="Giá hub ngắn"
              value={settings.hubShortPrice}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, hubShortPrice: value }))
              }
            />
            <SettingMoneyInput
              label="Giá ghép 2"
              value={settings.join2Price}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, join2Price: value }))
              }
            />
            <SettingMoneyInput
              label="Giá ghép 3"
              value={settings.join3Price}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, join3Price: value }))
              }
            />
            <SettingMoneyInput
              label="Giá ghép 4"
              value={settings.join4Price}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, join4Price: value }))
              }
            />
            <SettingMoneyInput
              label="Giá ghép 5"
              value={settings.join5Price}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, join5Price: value }))
              }
            />
          </div>
        </section>
      )}
    </>
  );
}

type ButtonProps = {
  active: boolean;
  children: string;
  onClick: () => void;
};

function TabButton({ active, children, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-bold ${
        active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function ChoiceButton({ active, children, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-bold ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function FormBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <h4 className="text-sm font-bold text-slate-700">{title}</h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function IncomeStat({
  label,
  value,
  signed = false,
}: {
  label: string;
  value: number;
  signed?: boolean;
}) {
  const isNegative = value < 0;
  const displayValue = signed
    ? `${isNegative ? "Giảm" : "Tăng"} ${formatMoney(Math.abs(value))}`
    : formatMoney(value);

  return (
    <div className={`rounded-xl p-3 ${isNegative ? "bg-red-50" : "bg-slate-100"}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`font-bold ${isNegative ? "text-red-600" : "text-slate-900"}`}>
        {displayValue}
      </p>
    </div>
  );
}

type SettingMoneyInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function SettingMoneyInput({ label, value, onChange }: SettingMoneyInputProps) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        inputMode="numeric"
        value={formatMoneyInput(String(value))}
        onChange={(event) => onChange(parseMoneyInput(event.target.value))}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </div>
  );
}
