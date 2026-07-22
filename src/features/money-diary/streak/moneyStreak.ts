import type {
  HubEntry,
  HubSettings,
  IncomeSource,
  StreakData,
  StreakDayStatus,
} from "../../../types/hub";
import { addDaysToDateString, getDateString } from "../../../utils/date";
import { calculateHubIncome } from "../../../utils/hubIncome";

export const MONTHLY_STREAK_RESTORE_LIMIT = 5;

export type MoneyStreakTodayStatus = "completed" | "incomplete";

export type MoneyStreakSummary = StreakData & {
  dayStatuses: Record<string, StreakDayStatus>;
  eligibleRestoreDate: string | null;
  restoreLimit: number;
  todayStatus: MoneyStreakTodayStatus;
};

export type MoneyStreakWeekDayStatus =
  | StreakDayStatus
  | "incomplete"
  | "neutral"
  | "future";

export type MoneyStreakWeekDay = {
  date: string;
  isToday: boolean;
  status: MoneyStreakWeekDayStatus;
};

export type MoneyStreakWeek = {
  days: MoneyStreakWeekDay[];
  endDate: string;
  startDate: string;
};

export type StreakIncome = {
  amount: number;
  source: IncomeSource;
};

export function getHubStreakIncome(
  entry: HubEntry,
  settings: HubSettings
): StreakIncome {
  const income = calculateHubIncome(entry, settings);

  return {
    amount: Math.max(income.basePrice, 0),
    source: "hub_shift",
  };
}

export function isHubEntryQualifiedForStreak(
  entry: HubEntry,
  settings: HubSettings
) {
  return getHubStreakIncome(entry, settings).amount > 0;
}

export function getQualifiedHubDates(
  entries: HubEntry[],
  settings: HubSettings,
  today: string
) {
  return new Set(
    entries
      .filter(
        (entry) =>
          entry.date <= today && isHubEntryQualifiedForStreak(entry, settings)
      )
      .map((entry) => entry.date)
  );
}

export function calculateMoneyStreak(
  entries: HubEntry[],
  settings: HubSettings,
  now = new Date()
): MoneyStreakSummary {
  const today = getDateString(now);
  const qualifiedDates = getQualifiedHubDates(entries, settings, today);
  const restoredDates = normalizeRestoredDates(
    settings.streakRestoredDates ?? [],
    today
  );
  const restoredDateSet = new Set(restoredDates);
  const activeDates = new Set([...qualifiedDates, ...restoredDates]);
  const todayStatus: MoneyStreakTodayStatus = qualifiedDates.has(today)
    ? "completed"
    : "incomplete";
  const currentEndDate = activeDates.has(today)
    ? today
    : addDaysToDateString(today, -1);
  const currentStreak = countRunEndingAt(activeDates, currentEndDate);
  const longestStreak = calculateLongestRun(activeDates, today);
  const restoreCredits = Math.max(
    MONTHLY_STREAK_RESTORE_LIMIT -
      restoredDates.filter((date) => date.startsWith(today.slice(0, 7))).length,
    0
  );
  const dayStatuses = buildStreakDayStatuses(
    qualifiedDates,
    restoredDateSet,
    today
  );
  const eligibleRestoreDate =
    restoreCredits > 0
      ? findEligibleRestoreDate(activeDates, today, restoreCredits)
      : null;
  if (eligibleRestoreDate) dayStatuses[eligibleRestoreDate] = "missed";
  const lastQualifiedDate = [...qualifiedDates].sort().at(-1) ?? null;

  return {
    currentStreak,
    longestStreak,
    lastQualifiedDate,
    restoreCredits,
    restoredDates,
    dayStatuses,
    eligibleRestoreDate,
    restoreLimit: MONTHLY_STREAK_RESTORE_LIMIT,
    todayStatus,
  };
}

export function restoreMoneyStreakDate(
  entries: HubEntry[],
  settings: HubSettings,
  date: string,
  now = new Date()
) {
  const summary = calculateMoneyStreak(entries, settings, now);

  if (!summary.eligibleRestoreDate || summary.eligibleRestoreDate !== date) {
    return null;
  }

  return {
    ...settings,
    streakRestoredDates: [...summary.restoredDates, date].sort(),
  } satisfies HubSettings;
}

export function getMoneyStreakWeek(
  summary: MoneyStreakSummary,
  weekOffset = 0,
  now = new Date()
): MoneyStreakWeek {
  const today = getDateString(now);
  const weekday = now.getDay() === 0 ? 7 : now.getDay();
  const startDate = addDaysToDateString(
    today,
    -(weekday - 1) + weekOffset * 7
  );
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateString(startDate, index);
    const streakStatus = summary.dayStatuses[date];
    const status: MoneyStreakWeekDayStatus =
      date > today
        ? "future"
        : streakStatus ??
          (date === today && summary.todayStatus === "incomplete"
            ? "incomplete"
            : "neutral");

    return {
      date,
      isToday: date === today,
      status,
    };
  });

  return {
    days,
    startDate,
    endDate: days[days.length - 1].date,
  };
}

function normalizeRestoredDates(dates: string[], today: string) {
  return [...new Set(dates)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today)
    .sort();
}

function countRunEndingAt(activeDates: Set<string>, endDate: string) {
  let cursor = endDate;
  let streak = 0;

  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateString(cursor, -1);
  }

  return streak;
}

function calculateLongestRun(activeDates: Set<string>, today: string) {
  const dates = [...activeDates].filter((date) => date <= today).sort();
  let longest = 0;
  let current = 0;
  let previousDate = "";

  dates.forEach((date) => {
    current =
      previousDate && addDaysToDateString(previousDate, 1) === date
        ? current + 1
        : 1;
    longest = Math.max(longest, current);
    previousDate = date;
  });

  return longest;
}

function buildStreakDayStatuses(
  qualifiedDates: Set<string>,
  restoredDates: Set<string>,
  today: string
) {
  const statuses: Record<string, StreakDayStatus> = {};
  const activeDates = new Set([...qualifiedDates, ...restoredDates]);

  qualifiedDates.forEach((date) => {
    statuses[date] = "qualified";
  });
  restoredDates.forEach((date) => {
    statuses[date] = "restored";
  });

  const firstActiveDate = [...activeDates].sort()[0];
  const lastCompletedDate = addDaysToDateString(today, -1);

  if (!firstActiveDate || firstActiveDate > lastCompletedDate) return statuses;

  let cursor = firstActiveDate;
  let hasStarted = false;

  while (cursor <= lastCompletedDate) {
    if (activeDates.has(cursor)) {
      hasStarted = true;
    } else if (hasStarted) {
      statuses[cursor] = "missed";
    }

    cursor = addDaysToDateString(cursor, 1);
  }

  return statuses;
}

function findEligibleRestoreDate(
  activeDates: Set<string>,
  today: string,
  restoreCredits: number
) {
  const earliestActiveDate = [...activeDates].sort()[0];
  if (!earliestActiveDate || restoreCredits <= 0) return null;

  let cursor = activeDates.has(today)
    ? today
    : addDaysToDateString(today, -1);

  while (cursor >= earliestActiveDate && activeDates.has(cursor)) {
    cursor = addDaysToDateString(cursor, -1);
  }

  const restoreDate = cursor;
  while (cursor >= earliestActiveDate && !activeDates.has(cursor)) {
    cursor = addDaysToDateString(cursor, -1);
  }

  if (!activeDates.has(cursor) || restoreDate === cursor) return null;

  return restoreDate;
}
