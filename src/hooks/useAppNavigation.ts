import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AppHistoryState, GoalScreen, Page } from "../types";

type NavigationOptions = {
  replace?: boolean;
  scrollTop?: number;
};

type MoneyNavigationTarget = Pick<AppHistoryState, "page" | "goalScreen">;

const retiredMoneyPages = new Set<Page>(["automation", "cashFlow", "dataHealth"]);

function isRetiredMoneyPage(page: unknown) {
  return typeof page === "string" && retiredMoneyPages.has(page as Page);
}

const moneyPagePaths: Record<Page, string> = {
  accounts: "/money/accounts",
  analytics: "/money/analytics",
  dataHealth: "/money/data-health",
  reconciliation: "/money/reconciliation",
  automation: "/money/automation",
  cashFlow: "/money/cash-flow",
  balanceChecks: "/money/history/balance-checks",
  changes: "/money/changes",
  closeDay: "/money/close-day",
  entry: "/money/entry",
  expenses: "/money/history/expenses",
  goals: "/money/goals",
  history: "/money/history/journal",
  home: "/money",
  photoJournal: "/money/photo-journal",
  spendingJars: "/money/spending-jars",
  hub: "/money/hub",
  settings: "/money/settings",
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

export function getNavigationScrollTop(
  current: MoneyNavigationTarget,
  next: MoneyNavigationTarget,
  currentScrollTop: number,
  requestedScrollTop?: number
) {
  if (typeof requestedScrollTop === "number") return requestedScrollTop;

  const staysOnSameScreen =
    current.page === next.page && current.goalScreen === next.goalScreen;

  return staysOnSameScreen ? currentScrollTop : 0;
}

export function getMoneyStateFromPath(pathname: string): AppHistoryState {
  const [, , segment, goalSegment, goalDetailSegment, goalIdSegment] =
    pathname.split("/");

  if (segment === "accounts") return { page: "accounts", goalScreen: "menu" };
  if (segment === "analytics") return { page: "analytics", goalScreen: "menu" };
  if (segment === "reconciliation") {
    return { page: "reconciliation", goalScreen: "menu" };
  }
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
  if (segment === "history") {
    if (goalSegment === "expenses") return { page: "expenses", goalScreen: "menu" };
    if (goalSegment === "balance-checks") {
      return { page: "balanceChecks", goalScreen: "menu" };
    }

    return { page: "history", goalScreen: "menu" };
  }
  if (segment === "photo-journal") {
    return { page: "photoJournal", goalScreen: "menu" };
  }
  if (segment === "spending-jars") return { page: "spendingJars", goalScreen: "menu" };
  if (segment === "hub") return { page: "hub", goalScreen: "menu" };
  if (segment === "settings") return { page: "settings", goalScreen: "menu" };

  return { page: "home", goalScreen: "menu" };
}

export function useAppNavigation() {
  const initialState = getMoneyStateFromPath(window.location.pathname);
  const [page, setPage] = useState<Page>(initialState.page);
  const [goalScreen, setGoalScreen] = useState<GoalScreen>(
    initialState.goalScreen
  );
  const [goalId, setGoalId] = useState<string | undefined>(initialState.goalId);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const pendingScrollTopRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollTop = pendingScrollTopRef.current ?? 0;

    pendingScrollTopRef.current = null;
    window.scrollTo({ top: scrollTop, left: 0, behavior: "auto" });
  }, [goalId, goalScreen, navigationVersion, page]);

  useEffect(() => {
    const initialState = getMoneyStateFromPath(window.location.pathname);

    const currentHistoryState = window.history.state as
      | Partial<AppHistoryState>
      | null;

    window.history.replaceState(
      {
        ...initialState,
        photoJournalHasReturn:
          initialState.page === "photoJournal" &&
          currentHistoryState?.page === "photoJournal" &&
          currentHistoryState.photoJournalHasReturn === true,
        scrollTop:
          typeof currentHistoryState?.scrollTop === "number"
            ? currentHistoryState.scrollTop
            : window.scrollY,
      } satisfies AppHistoryState,
      "",
      window.location.href
    );

    let scrollFrame = 0;

    function persistCurrentScrollPosition() {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);

      scrollFrame = window.requestAnimationFrame(() => {
        const state = window.history.state as Partial<AppHistoryState> | null;

        if (!state?.page) return;

        window.history.replaceState(
          { ...state, scrollTop: window.scrollY },
          "",
          window.location.href
        );
        scrollFrame = 0;
      });
    }

    function handleBrowserBack(event: PopStateEvent) {
      const state = event.state as AppHistoryState | null;

      if (state?.page && !isRetiredMoneyPage(state.page)) {
        pendingScrollTopRef.current = state.scrollTop ?? 0;
        setPage(state.page);
        setGoalScreen(state.goalScreen ?? "menu");
        setGoalId(state.goalId);
        setNavigationVersion((current) => current + 1);
        return;
      }

      const nextState = getMoneyStateFromPath(window.location.pathname);

      pendingScrollTopRef.current = nextState.scrollTop ?? 0;
      setPage(nextState.page);
      setGoalScreen(nextState.goalScreen);
      setGoalId(nextState.goalId);
      setNavigationVersion((current) => current + 1);
    }

    window.addEventListener("popstate", handleBrowserBack);
    window.addEventListener("scroll", persistCurrentScrollPosition, {
      passive: true,
    });

    return () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("popstate", handleBrowserBack);
      window.removeEventListener("scroll", persistCurrentScrollPosition);
    };
  }, []);

  function navigateTo(
    nextPage: Page,
    nextGoalScreen: GoalScreen = "menu",
    nextGoalId?: string,
    options?: NavigationOptions
  ) {
    const targetPage: Page = isRetiredMoneyPage(nextPage) ? "home" : nextPage;
    const targetGoalScreen = targetPage === nextPage ? nextGoalScreen : "menu";
    const nextScrollTop = getNavigationScrollTop(
      { page, goalScreen },
      { page: targetPage, goalScreen: targetGoalScreen },
      window.scrollY,
      options?.scrollTop
    );
    const nextState: AppHistoryState = {
      page: targetPage,
      goalScreen: targetGoalScreen,
      goalId: targetPage === nextPage ? nextGoalId : undefined,
      scrollTop: nextScrollTop,
      photoJournalHasReturn:
        targetPage === "photoJournal" && page !== "photoJournal" && !options?.replace,
    };
    const nextPath = window.location.pathname.startsWith("/money")
      ? targetPage === "goals"
        ? getGoalScreenPath(targetGoalScreen, nextGoalId)
        : moneyPagePaths[targetPage]
      : window.location.href;

    if (options?.replace) {
      window.history.replaceState(nextState, "", nextPath);
    } else {
      const currentState = window.history.state as
        | Partial<AppHistoryState>
        | null;

      if (currentState?.page) {
        window.history.replaceState(
          { ...currentState, scrollTop: window.scrollY },
          "",
          window.location.href
        );
      }
      window.history.pushState(nextState, "", nextPath);
    }

    pendingScrollTopRef.current = nextScrollTop;
    setPage(targetPage);
    setGoalScreen(targetGoalScreen);
    setGoalId(targetPage === nextPage ? nextGoalId : undefined);
    setNavigationVersion((current) => current + 1);
  }

  function returnFromPhotoJournal() {
    const state = window.history.state as Partial<AppHistoryState> | null;
    if (page === "photoJournal" && state?.photoJournalHasReturn) {
      window.history.back();
      return;
    }

    // A direct journal link has no in-app screen to return to.
    navigateTo("home", "menu", undefined, { replace: true });
  }

  function resetMoneyNavigation() {
    pendingScrollTopRef.current = 0;
    setPage("home");
    setGoalScreen("menu");
    setGoalId(undefined);
    setNavigationVersion((current) => current + 1);
  }

  return {
    page,
    goalId,
    goalScreen,
    setGoalScreen,
    navigateTo,
    returnFromPhotoJournal,
    resetMoneyNavigation,
  };
}
