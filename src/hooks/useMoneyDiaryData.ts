import { useEffect, useState } from "react";
import {
  STORAGE_BALANCE_CHECKS_KEY,
  STORAGE_COMPLETED_GOALS_KEY,
  STORAGE_ENTRIES_KEY,
  STORAGE_EXPENSES_KEY,
  STORAGE_GOALS_KEY,
  defaultGoals,
} from "../constants";
import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../types";

function loadJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);

  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function useMoneyDiaryData() {
  const [entries, setEntries] = useState<DailyEntry[]>(() =>
    loadJson(STORAGE_ENTRIES_KEY, [])
  );
  const [goals, setGoals] = useState<Goals>(() => ({
    ...defaultGoals,
    ...loadJson<Partial<Goals>>(STORAGE_GOALS_KEY, {}),
  }));
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>(() =>
    loadJson(STORAGE_COMPLETED_GOALS_KEY, [])
  );
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() =>
    loadJson(STORAGE_EXPENSES_KEY, [])
  );
  const [balanceChecks, setBalanceChecks] = useState<BalanceCheckEntry[]>(() =>
    loadJson(STORAGE_BALANCE_CHECKS_KEY, [])
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_GOALS_KEY, JSON.stringify(goals));
    localStorage.setItem(
      STORAGE_BALANCE_CHECKS_KEY,
      JSON.stringify(balanceChecks)
    );
    localStorage.setItem(
      STORAGE_COMPLETED_GOALS_KEY,
      JSON.stringify(completedGoals)
    );
  }, [entries, expenses, balanceChecks, goals, completedGoals]);

  return {
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
  };
}
