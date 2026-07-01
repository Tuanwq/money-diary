import { useEffect, useState } from "react";
import type { AppHistoryState, GoalScreen, Page } from "../types";

export function useAppNavigation() {
  const [page, setPage] = useState<Page>("home");
  const [goalScreen, setGoalScreen] = useState<GoalScreen>("menu");

  useEffect(() => {
    const initialState: AppHistoryState = {
      page: "home",
      goalScreen: "menu",
    };

    window.history.replaceState(initialState, "", window.location.href);

    function handleBrowserBack(event: PopStateEvent) {
      const state = event.state as AppHistoryState | null;

      if (state?.page) {
        setPage(state.page);
        setGoalScreen(state.goalScreen ?? "menu");
        return;
      }

      setPage("home");
      setGoalScreen("menu");
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

    window.history.pushState(nextState, "", window.location.href);

    setPage(nextPage);
    setGoalScreen(nextGoalScreen);
  }

  return {
    page,
    goalScreen,
    setGoalScreen,
    navigateTo,
  };
}
