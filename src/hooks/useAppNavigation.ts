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

function getMoneyStateFromPath(pathname: string): AppHistoryState {
  const segment = pathname.split("/")[2];

  if (segment === "balance-checks") return { page: "balanceChecks", goalScreen: "menu" };
  if (segment === "changes") return { page: "changes", goalScreen: "menu" };
  if (segment === "close-day") return { page: "closeDay", goalScreen: "menu" };
  if (segment === "entry") return { page: "entry", goalScreen: "menu" };
  if (segment === "expenses") return { page: "expenses", goalScreen: "menu" };
  if (segment === "goals") return { page: "goals", goalScreen: "menu" };
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

  useEffect(() => {
    const initialState = getMoneyStateFromPath(window.location.pathname);

    window.history.replaceState(initialState, "", window.location.href);

    function handleBrowserBack(event: PopStateEvent) {
      const state = event.state as AppHistoryState | null;

      if (state?.page) {
        setPage(state.page);
        setGoalScreen(state.goalScreen ?? "menu");
        return;
      }

      const nextState = getMoneyStateFromPath(window.location.pathname);

      setPage(nextState.page);
      setGoalScreen(nextState.goalScreen);
    }

    window.addEventListener("popstate", handleBrowserBack);

    return () => {
      window.removeEventListener("popstate", handleBrowserBack);
    };
  }, []);

  function navigateTo(nextPage: Page, nextGoalScreen: GoalScreen = "menu") {
    const nextState: AppHistoryState = {
      page: nextPage,
      goalScreen: nextGoalScreen,
    };
    const nextPath = window.location.pathname.startsWith("/money")
      ? moneyPagePaths[nextPage]
      : window.location.href;

    window.history.pushState(nextState, "", nextPath);

    setPage(nextPage);
    setGoalScreen(nextGoalScreen);
  }

  function resetMoneyNavigation() {
    setPage("home");
    setGoalScreen("menu");
  }

  return {
    page,
    goalScreen,
    setGoalScreen,
    navigateTo,
    resetMoneyNavigation,
  };
}
