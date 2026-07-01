import type { Goals, Mood } from "./types";
import { getToday } from "./utils/date";

export const STORAGE_ENTRIES_KEY = "money_diary_entries";
export const STORAGE_GOALS_KEY = "money_diary_goals";
export const STORAGE_COMPLETED_GOALS_KEY = "money_diary_completed_goals";
export const STORAGE_EXPENSES_KEY = "money_diary_expenses";
export const STORAGE_BALANCE_CHECKS_KEY = "money_diary_balance_checks";

export const ITEMS_PER_PAGE = 7;

export const defaultGoals: Goals = {
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

export const moodLabels: Record<Mood, string> = {
  good: "Vui",
  normal: "Bình thường",
  tired: "Mệt",
  bad: "Tệ",
};
