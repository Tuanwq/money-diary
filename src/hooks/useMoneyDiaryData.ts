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
import { safeSetStorageJson } from "../utils/safeStorage";

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
    safeSetStorageJson(STORAGE_ENTRIES_KEY, entries);
    safeSetStorageJson(STORAGE_EXPENSES_KEY, expenses);
    safeSetStorageJson(STORAGE_GOALS_KEY, goals);
    safeSetStorageJson(STORAGE_BALANCE_CHECKS_KEY, balanceChecks);
    safeSetStorageJson(STORAGE_COMPLETED_GOALS_KEY, completedGoals);
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
