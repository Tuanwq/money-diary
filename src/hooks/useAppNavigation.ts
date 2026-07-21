import { useEffect, useState } from "react";
import type { AppHistoryState, GoalScreen, Page } from "../types";

const moneyPagePaths: Record<Page, string> = {
  balanceChecks: "/money/balance-checks",
  changes: "/money/changes",
  closeDay: "/money/close-day",
  entry: "/money/entry",
  expenses: "/money/expenses",
  goals: "/money/goals",
  history: "/money/history",
  home: "/money",
  hub: "/money/hub",
};

const goalScreenPaths: Record<GoalScreen, string> = {
  menu: "/money/goals",
  current: "/money/goals/current",
  subGoals: "/money/goals/secondary",
  balance: "/money/goals/movements",
  completed: "/money/goals/completed",
  completedDetail: "/money/goals/completed/detail",
  milestones: "/money/goals/milestones",
};

export function getGoalScreenPath(screen: GoalScreen, goalId?: string) {
  const basePath = goalScreenPaths[screen];

  if (!goalId) return basePath;
  if (screen === "subGoals") return `${basePath}/${encodeURIComponent(goalId)}`;
  if (screen === "completedDetail") {
    return `${basePath}/${encodeURIComponent(goalId)}`;
  }

  return basePath;
}

export function getMoneyStateFromPath(pathname: string): AppHistoryState {
  const [, , segment, goalSegment, goalDetailSegment, goalIdSegment] =
    pathname.split("/");

  if (segment === "balance-checks") return { page: "balanceChecks", goalScreen: "menu" };
  if (segment === "changes") return { page: "changes", goalScreen: "menu" };
  if (segment === "close-day") return { page: "closeDay", goalScreen: "menu" };
  if (segment === "entry") return { page: "entry", goalScreen: "menu" };
  if (segment === "expenses") return { page: "expenses", goalScreen: "menu" };
  if (segment === "goals") {
    const goalScreen: GoalScreen =
      goalSegment === "current"
        ? "current"
        : goalSegment === "secondary"
          ? "subGoals"
          : goalSegment === "movements"
            ? "balance"
            : goalSegment === "completed" && goalDetailSegment === "detail"
              ? "completedDetail"
              : goalSegment === "completed"
                ? "completed"
                : goalSegment === "milestones"
                  ? "milestones"
                  : "menu";

    const goalId =
      goalScreen === "subGoals"
        ? goalDetailSegment
        : goalScreen === "completedDetail"
          ? goalIdSegment
          : undefined;

    return {
      page: "goals",
      goalScreen,
      goalId: goalId ? decodeURIComponent(goalId) : undefined,
    };
  }
  if (segment === "history") return { page: "history", goalScreen: "menu" };
  if (segment === "hub") return { page: "hub", goalScreen: "menu" };

  return { page: "home", goalScreen: "menu" };
}

export function useAppNavigation() {
  const initialState = getMoneyStateFromPath(window.location.pathname);
  const [page, setPage] = useState<Page>(initialState.page);
  const [goalScreen, setGoalScreen] = useState<GoalScreen>(
    initialState.goalScreen
  );
  const [goalId, setGoalId] = useState<string | undefined>(initialState.goalId);

  useEffect(() => {
    const initialState = getMoneyStateFromPath(window.location.pathname);

    window.history.replaceState(initialState, "", window.location.href);

    function handleBrowserBack(event: PopStateEvent) {
      const state = event.state as AppHistoryState | null;

      if (state?.page) {
        setPage(state.page);
        setGoalScreen(state.goalScreen ?? "menu");
        setGoalId(state.goalId);
        return;
      }

      const nextState = getMoneyStateFromPath(window.location.pathname);

      setPage(nextState.page);
      setGoalScreen(nextState.goalScreen);
      setGoalId(nextState.goalId);
    }

    window.addEventListener("popstate", handleBrowserBack);

    return () => {
      window.removeEventListener("popstate", handleBrowserBack);
    };
  }, []);

  function navigateTo(
    nextPage: Page,
    nextGoalScreen: GoalScreen = "menu",
    nextGoalId?: string
  ) {
    const nextState: AppHistoryState = {
      page: nextPage,
      goalScreen: nextGoalScreen,
      goalId: nextGoalId,
    };
    const nextPath = window.location.pathname.startsWith("/money")
      ? nextPage === "goals"
        ? getGoalScreenPath(nextGoalScreen, nextGoalId)
        : moneyPagePaths[nextPage]
      : window.location.href;

    window.history.pushState(nextState, "", nextPath);

    setPage(nextPage);
    setGoalScreen(nextGoalScreen);
    setGoalId(nextGoalId);
  }

  function resetMoneyNavigation() {
    setPage("home");
    setGoalScreen("menu");
    setGoalId(undefined);
  }

  return {
    page,
    goalId,
    goalScreen,
    setGoalScreen,
    navigateTo,
    resetMoneyNavigation,
  };
}
