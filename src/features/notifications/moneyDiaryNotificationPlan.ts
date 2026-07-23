import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
  SubGoal,
} from "../../types";
import {
  addDaysToDateString,
  getDateString,
  getDaysLeftFromDate,
  toDate,
} from "../../utils/date";
import {
  getExpenseTotal,
  getNormalIncome,
  getTotalEntryMoney,
} from "../../utils/entries";
import {
  getGoalTimeProgressAtDate,
  getProgress,
  getSubGoalSaved,
} from "../../utils/goals";
import { formatMoney } from "../../utils/money";
import { APP_NOTIFICATION_CONFIG } from "./config";
import type {
  MoneyDiaryNotificationSettings,
  MoneyDiaryNotificationType,
  NotificationJobDraft,
} from "./types";

type BuildMoneyDiaryNotificationPlanInput = {
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  now?: Date;
  settings: MoneyDiaryNotificationSettings;
  syncFailureCount?: number;
  userId: string;
};

type PeriodTotals = {
  expense: number;
  income: number;
  net: number;
};

type GoalCandidate = {
  deadline: string;
  id: string;
  kind: "main" | "sub";
  name: string;
  saved: number;
  startDate: string;
  target: number;
};

const moneyConfig = APP_NOTIFICATION_CONFIG.money_diary;
const DAILY_REMINDER_HORIZON_DAYS = 31;

function toScheduledIso(date: string, time: string) {
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : "20:00";

  return new Date(`${date}T${normalizedTime}:00+07:00`).toISOString();
}

function isFuture(isoDate: string, now: Date) {
  return new Date(isoDate).getTime() > now.getTime();
}

function todayTimeOrSoon(date: string, time: string, now: Date) {
  const scheduled = toScheduledIso(date, time);

  if (date === getDateString(now) && !isFuture(scheduled, now)) {
    return new Date(now.getTime() + 5_000).toISOString();
  }

  return scheduled;
}

function getPeriodTotals(
  entries: DailyEntry[],
  expenses: ExpenseEntry[],
  fromDate: string,
  toDate: string
): PeriodTotals {
  const income = entries
    .filter((entry) => entry.date >= fromDate && entry.date <= toDate)
    .reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0);
  const expense = expenses
    .filter((item) => item.date >= fromDate && item.date <= toDate)
    .reduce((sum, item) => sum + getExpenseTotal(item), 0);

  return {
    expense,
    income,
    net: income - expense,
  };
}

function getWeekRange(today: string) {
  const date = toDate(today);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    fromDate: getDateString(start),
    toDate: getDateString(end),
  };
}

function getMonthRange(today: string) {
  const date = toDate(today);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    fromDate: getDateString(start),
    month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    toDate: getDateString(end),
  };
}

function getConfiguredWeekdayDate(today: string, weekday: number) {
  const date = toDate(today);
  const current = date.getDay();
  const delta = (weekday - current + 7) % 7;
  date.setDate(date.getDate() + delta);

  return getDateString(date);
}

function createMoneyJob({
  body,
  data,
  dedupeKey,
  scheduledFor,
  type,
}: {
  body: string;
  data: NotificationJobDraft["payload"]["data"];
  dedupeKey: string;
  scheduledFor: string;
  type: MoneyDiaryNotificationType;
}): NotificationJobDraft {
  return {
    appIdentifier: "money_diary",
    dedupeKey,
    notificationType: type,
    scheduledFor,
    payload: {
      app: "money_diary",
      badge: moneyConfig.badge,
      body,
      data,
      icon: moneyConfig.icon,
      soundEnabled: true,
      tag: dedupeKey,
      title: "Money Diary",
      vibrationEnabled: true,
    },
  };
}

function getGoalCandidates(goals: Goals): GoalCandidate[] {
  const candidates: GoalCandidate[] = [];

  if (goals.bigGoalTarget > 0 && goals.bigGoalDeadline) {
    candidates.push({
      deadline: goals.bigGoalDeadline,
      id: `main-${goals.bigGoalStartDate || "current"}`,
      kind: "main",
      name: goals.bigGoalName || "Mục tiêu chính",
      saved: goals.bigGoalSaved,
      startDate: goals.bigGoalStartDate,
      target: goals.bigGoalTarget,
    });
  }

  for (const goal of goals.subGoals ?? []) {
    candidates.push({
      deadline: goal.deadline,
      id: goal.id,
      kind: "sub",
      name: goal.name,
      saved: getSubGoalSaved(goal),
      startDate: goal.startDate,
      target: goal.target,
    });
  }

  return candidates;
}

function getActualMainGoalMoney(
  goals: Goals,
  entries: DailyEntry[],
  expenses: ExpenseEntry[]
) {
  return (
    goals.bigGoalSaved +
    entries.reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0) -
    expenses.reduce((sum, expense) => sum + getExpenseTotal(expense), 0)
  );
}

function withSettingPreferences(
  jobs: NotificationJobDraft[],
  settings: MoneyDiaryNotificationSettings
) {
  return jobs.map((job) => ({
    ...job,
    payload: {
      ...job.payload,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
    },
  }));
}

export function buildMoneyDiaryNotificationPlan({
  balanceChecks,
  completedGoals,
  entries,
  expenses,
  goals,
  now = new Date(),
  settings,
  syncFailureCount = 0,
  userId,
}: BuildMoneyDiaryNotificationPlanInput) {
  const today = getDateString(now);
  const todayEntry = entries.find((entry) => entry.date === today);
  const todayExpense = expenses.find((expense) => expense.date === today);
  const jobs: NotificationJobDraft[] = [];

  const addFutureJob = (job: NotificationJobDraft) => {
    if (isFuture(job.scheduledFor, now)) jobs.push(job);
  };

  for (let offset = 0; offset < DAILY_REMINDER_HORIZON_DAYS; offset += 1) {
    const reminderDate = addDaysToDateString(today, offset);
    const entryForDate = entries.find((entry) => entry.date === reminderDate);
    const expenseForDate = expenses.find(
      (expense) => expense.date === reminderDate
    );

    if (settings.dailyEntryEnabled && !entryForDate) {
      addFutureJob(
        createMoneyJob({
          body: "Bạn chưa ghi nhật ký hôm nay. Hãy cập nhật thu nhập, giờ làm và chi tiêu trong ngày.",
          data: {
            app: "money_diary",
            date: reminderDate,
            targetUrl: `/money/entry?date=${reminderDate}`,
            type: "daily_entry_reminder",
          },
          dedupeKey: `money-daily-entry-${userId}-${reminderDate}`,
          scheduledFor: todayTimeOrSoon(
            reminderDate,
            settings.dailyEntryTime,
            now
          ),
          type: "daily_entry_reminder",
        })
      );
    }

    if (settings.expenseReminderEnabled && !expenseForDate) {
      addFutureJob(
        createMoneyJob({
          body: "Bạn chưa cập nhật chi tiêu hôm nay. Hãy kiểm tra tiền ăn và các khoản chi khác trước khi kết thúc ngày.",
          data: {
            app: "money_diary",
            date: reminderDate,
            targetUrl: `/money/history/expenses?date=${reminderDate}`,
            type: "expense_entry_reminder",
          },
          dedupeKey: `money-expense-entry-${userId}-${reminderDate}`,
          scheduledFor: todayTimeOrSoon(
            reminderDate,
            settings.expenseReminderTime,
            now
          ),
          type: "expense_entry_reminder",
        })
      );
    }

    const validIncome = entryForDate ? getNormalIncome(entryForDate) : 0;
    const dailyTargetRemaining = Math.max(
      goals.dailyIncome - validIncome,
      0
    );

    if (
      settings.dailyIncomeTargetEnabled &&
      goals.dailyIncome > 0 &&
      dailyTargetRemaining > 0
    ) {
      addFutureJob(
        createMoneyJob({
          body: `Mục tiêu hôm nay chưa hoàn thành. Bạn còn thiếu ${formatMoney(
            dailyTargetRemaining
          )} để đạt kế hoạch trong ngày.`,
          data: {
            app: "money_diary",
            date: reminderDate,
            targetUrl: `/money?date=${reminderDate}`,
            type: "income_target_reminder",
          },
          dedupeKey: `money-income-target-${userId}-${reminderDate}`,
          scheduledFor: todayTimeOrSoon(
            reminderDate,
            settings.dailyIncomeCheckTime,
            now
          ),
          type: "income_target_reminder",
        })
      );
    }
  }

  const goalCandidates = getGoalCandidates(goals).map((goal) =>
    goal.id.startsWith("main-")
      ? {
          ...goal,
          saved: getActualMainGoalMoney(goals, entries, expenses),
        }
      : goal
  );

  for (const goal of goalCandidates) {
    const isStarted = !goal.startDate || goal.startDate <= today;
    const remaining = Math.max(goal.target - goal.saved, 0);

    if (!isStarted || remaining <= 0 || goal.deadline < today) continue;

    const daysLeft = getDaysLeftFromDate(goal.deadline, today);
    const moneyProgress = getProgress(goal.saved, goal.target);
    const timeProgress = getGoalTimeProgressAtDate(
      goal.startDate || today,
      goal.deadline,
      today
    );
    const targetUrl =
      goal.kind === "main"
        ? `/money/goals/current?goalId=${encodeURIComponent(goal.id)}`
        : `/money/goals/secondary/${encodeURIComponent(goal.id)}`;

    if (
      settings.goalProgressWarningEnabled &&
      moneyProgress + 5 < timeProgress
    ) {
      addFutureJob(
        createMoneyJob({
          body: `Bạn đang chậm tiến độ. Mục tiêu “${goal.name}” còn thiếu ${formatMoney(
            remaining
          )} và còn ${daysLeft} ngày.`,
          data: {
            app: "money_diary",
            date: today,
            goalId: goal.id,
            targetUrl,
            type: "goal_progress_warning",
          },
          dedupeKey: `money-goal-progress-${goal.id}-${today}`,
          scheduledFor: todayTimeOrSoon(today, "18:30", now),
          type: "goal_progress_warning",
        })
      );
    }

    if (settings.goalDeadlineWarningEnabled) {
      for (const warningDays of settings.goalDeadlineDays) {
        const warningDate = addDaysToDateString(goal.deadline, -warningDays);

        if (warningDate < today) continue;

        addFutureJob(
          createMoneyJob({
            body: `Mục tiêu “${goal.name}” còn ${warningDays} ngày và còn thiếu ${formatMoney(
              remaining
            )}.`,
            data: {
              app: "money_diary",
              date: warningDate,
              goalId: goal.id,
              targetUrl,
              type: "goal_deadline_warning",
            },
            dedupeKey: `money-goal-deadline-${goal.id}-${warningDays}`,
            scheduledFor: todayTimeOrSoon(warningDate, "09:00", now),
            type: "goal_deadline_warning",
          })
        );
      }
    }
  }

  for (const goal of completedGoals) {
    const completedDate = goal.completedAt.slice(0, 10);

    if (completedDate !== today) continue;

    addFutureJob(
      createMoneyJob({
        body: `“${goal.name}” đã đạt 100%. Thành quả đã được lưu vào lịch sử.`,
        data: {
          app: "money_diary",
          date: completedDate,
          goalId: goal.id,
          targetUrl: `/money/goals/completed/detail/${encodeURIComponent(goal.id)}`,
          type: "goal_completed",
        },
        dedupeKey: `money-goal-completed-${goal.id}`,
        scheduledFor: new Date(now.getTime() + 5_000).toISOString(),
        type: "goal_completed",
      })
    );
  }

  if (settings.dailySummaryEnabled && (todayEntry || todayExpense)) {
    const totals = getPeriodTotals(entries, expenses, today, today);
    const mainGoalMoney = getActualMainGoalMoney(goals, entries, expenses);
    const progress = getProgress(mainGoalMoney, goals.bigGoalTarget);

    addFutureJob(
      createMoneyJob({
        body: `Tổng kết hôm nay: Thu nhập ${formatMoney(
          totals.income
        )}, chi tiêu ${formatMoney(totals.expense)}, tăng ròng ${formatMoney(
          totals.net
        )}. Tiến độ mục tiêu ${progress}%.`,
        data: {
          app: "money_diary",
          date: today,
          targetUrl: `/money?date=${today}&summary=daily`,
          type: "daily_financial_summary",
        },
        dedupeKey: `money-daily-summary-${userId}-${today}`,
        scheduledFor: todayTimeOrSoon(today, settings.dailySummaryTime, now),
        type: "daily_financial_summary",
      })
    );
  }

  if (settings.weeklySummaryEnabled) {
    const range = getWeekRange(today);
    const totals = getPeriodTotals(
      entries,
      expenses,
      range.fromDate,
      range.toDate
    );
    const sendDate = getConfiguredWeekdayDate(
      today,
      settings.weeklySummaryDay
    );

    addFutureJob(
      createMoneyJob({
        body: `Tổng kết tuần: Bạn kiếm được ${formatMoney(
          totals.income
        )}, chi ${formatMoney(totals.expense)} và tăng ròng ${formatMoney(
          totals.net
        )}.`,
        data: {
          app: "money_diary",
          date: range.toDate,
          targetUrl: `/money?period=week&date=${range.toDate}`,
          type: "weekly_financial_summary",
        },
        dedupeKey: `money-weekly-summary-${userId}-${range.fromDate}`,
        scheduledFor: todayTimeOrSoon(
          sendDate,
          settings.weeklySummaryTime,
          now
        ),
        type: "weekly_financial_summary",
      })
    );
  }

  if (settings.monthlySummaryEnabled) {
    const range = getMonthRange(today);
    const totals = getPeriodTotals(
      entries,
      expenses,
      range.fromDate,
      range.toDate
    );

    addFutureJob(
      createMoneyJob({
        body: `Báo cáo tháng ${Number(range.month.slice(5))}: Tổng thu ${formatMoney(
          totals.income
        )}, tổng chi ${formatMoney(totals.expense)}, tăng ròng ${formatMoney(
          totals.net
        )}.`,
        data: {
          app: "money_diary",
          targetUrl: `/money?period=month&month=${range.month}`,
          type: "monthly_financial_summary",
        },
        dedupeKey: `money-monthly-summary-${userId}-${range.month}`,
        scheduledFor: todayTimeOrSoon(
          range.toDate,
          settings.monthlySummaryTime,
          now
        ),
        type: "monthly_financial_summary",
      })
    );
  }

  const todayBalance = balanceChecks.find((item) => item.date === today);

  if (
    settings.balanceWarningEnabled &&
    todayBalance &&
    Math.abs(todayBalance.difference) >= settings.balanceWarningThreshold
  ) {
    const direction = todayBalance.difference < 0 ? "thấp hơn" : "cao hơn";

    addFutureJob(
      createMoneyJob({
        body: `Số dư thực tế đang ${direction} ứng dụng ${formatMoney(
          Math.abs(todayBalance.difference)
        )}.`,
        data: {
          app: "money_diary",
          date: today,
          targetUrl: `/money/history/balance-checks?date=${today}`,
          type: "balance_difference_warning",
        },
        dedupeKey: `money-balance-difference-${userId}-${today}`,
        scheduledFor: new Date(now.getTime() + 10_000).toISOString(),
        type: "balance_difference_warning",
      })
    );
  }

  if (settings.syncWarningEnabled && syncFailureCount >= 3) {
    addFutureJob(
      createMoneyJob({
        body: "Một số dữ liệu chưa được đồng bộ. Hãy mở ứng dụng khi có mạng để tránh mất dữ liệu.",
        data: {
          app: "money_diary",
          date: today,
          targetUrl: "/money/settings?section=sync",
          type: "sync_failed",
        },
        dedupeKey: `money-sync-failed-${userId}-${today}`,
        scheduledFor: new Date(now.getTime() + 15 * 60_000).toISOString(),
        type: "sync_failed",
      })
    );
  }

  if (settings.backupReminderEnabled) {
    const month = getMonthRange(today);
    const nextMonthFirst = addDaysToDateString(month.toDate, 1);

    addFutureJob(
      createMoneyJob({
        body: "Đã đến lúc kiểm tra đồng bộ và xuất một bản báo cáo dự phòng cho dữ liệu tài chính.",
        data: {
          app: "money_diary",
          targetUrl: "/money/settings?section=backup",
          type: "backup_reminder",
        },
        dedupeKey: `money-backup-reminder-${userId}-${month.month}`,
        scheduledFor: toScheduledIso(nextMonthFirst, "19:00"),
        type: "backup_reminder",
      })
    );
  }

  return withSettingPreferences(jobs, settings);
}

export function getMoneyDiaryDayIncome(entry?: DailyEntry) {
  return entry ? getNormalIncome(entry) : 0;
}

export function getMoneyDiaryPeriodTotals(
  entries: DailyEntry[],
  expenses: ExpenseEntry[],
  fromDate: string,
  toDate: string
) {
  return getPeriodTotals(entries, expenses, fromDate, toDate);
}

export function getMoneyDiaryGoalCandidateFromSubGoal(goal: SubGoal) {
  return {
    deadline: goal.deadline,
    id: goal.id,
    kind: "sub",
    name: goal.name,
    saved: getSubGoalSaved(goal),
    startDate: goal.startDate,
    target: goal.target,
  } satisfies GoalCandidate;
}
