import { useEffect, useRef } from "react";
import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../../types";
import { addDaysToDateString, getToday } from "../../utils/date";
import type { DayMarkTask } from "../daymark/types/daymark";
import { buildDayMarkNotificationPlan } from "./dayMarkNotificationPlan";
import {
  loadDayMarkNotificationSettings,
  loadMoneyDiaryNotificationSettings,
  syncNotificationJobs,
} from "./notificationService";
import { buildMoneyDiaryNotificationPlan } from "./moneyDiaryNotificationPlan";
import { supabase } from "../../lib/supabase";

type MoneySchedulerInput = {
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  syncStatus: string;
  userId?: string;
};

function isSyncFailure(status: string) {
  const normalized = status.toLowerCase();
  return normalized.includes("lỗi") || normalized.includes("chưa thể");
}

export function useMoneyDiaryNotificationScheduler({
  balanceChecks,
  completedGoals,
  entries,
  expenses,
  goals,
  syncStatus,
  userId,
}: MoneySchedulerInput) {
  const syncFailureCountRef = useRef(0);

  useEffect(() => {
    if (isSyncFailure(syncStatus)) {
      syncFailureCountRef.current += 1;
    } else if (syncStatus === "Đã đồng bộ") {
      syncFailureCountRef.current = 0;
    }
  }, [syncStatus]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    let timeout = 0;

    const schedule = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(async () => {
        try {
          const settings = await loadMoneyDiaryNotificationSettings(userId);
          if (!active) return;

          const jobs = buildMoneyDiaryNotificationPlan({
            balanceChecks,
            completedGoals,
            entries,
            expenses,
            goals,
            settings,
            syncFailureCount: syncFailureCountRef.current,
            userId,
          });

          await syncNotificationJobs(userId, "money_diary", jobs);
        } catch (error) {
          console.error("Không thể cập nhật lịch thông báo Money Diary", error);
        }
      }, 1_200);
    };

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ appIdentifier?: string }>).detail;
      if (detail?.appIdentifier === "money_diary") schedule();
    };

    schedule();
    const interval = window.setInterval(schedule, 15 * 60_000);
    window.addEventListener(
      "app-notification-settings-updated",
      handleSettingsUpdated
    );

    return () => {
      active = false;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener(
        "app-notification-settings-updated",
        handleSettingsUpdated
      );
    };
  }, [
    balanceChecks,
    completedGoals,
    entries,
    expenses,
    goals,
    syncStatus,
    userId,
  ]);
}

async function loadUpcomingDayMarkTasks(userId: string) {
  const fromDate = getToday();
  const toDate = addDaysToDateString(fromDate, 31);
  const { data, error } = await supabase
    .from("daymark_tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("task_date", fromDate)
    .lte("task_date", toDate)
    .order("task_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DayMarkTask[];
}

export function useDayMarkNotificationScheduler(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    let active = true;
    let timeout = 0;

    const schedule = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(async () => {
        try {
          const [settings, tasks] = await Promise.all([
            loadDayMarkNotificationSettings(userId),
            loadUpcomingDayMarkTasks(userId),
          ]);

          if (!active) return;

          await syncNotificationJobs(
            userId,
            "daymark",
            buildDayMarkNotificationPlan({ settings, tasks, userId })
          );
        } catch (error) {
          console.error("Không thể cập nhật lịch thông báo DayMark", error);
        }
      }, 700);
    };

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ appIdentifier?: string }>).detail;
      if (detail?.appIdentifier === "daymark") schedule();
    };

    schedule();
    const interval = window.setInterval(schedule, 15 * 60_000);
    window.addEventListener("daymark:tasks-changed", schedule);
    window.addEventListener(
      "app-notification-settings-updated",
      handleSettingsUpdated
    );

    return () => {
      active = false;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("daymark:tasks-changed", schedule);
      window.removeEventListener(
        "app-notification-settings-updated",
        handleSettingsUpdated
      );
    };
  }, [userId]);
}

