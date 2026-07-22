export type AppRouteKind = "login" | "hub" | "money" | "daymark" | "unknown";

export type DayMarkRoute =
  | "today"
  | "calendar"
  | "statistics"
  | "notes"
  | "settings"
  | "pomodoro";

export type AppRoute = {
  dayMarkRoute: DayMarkRoute;
  kind: AppRouteKind;
  path: string;
};

export function shouldResetAppScroll(previous: AppRoute, next: AppRoute) {
  if (previous.kind !== next.kind) return true;

  return (
    next.kind === "daymark" &&
    previous.dayMarkRoute !== next.dayMarkRoute
  );
}

const dayMarkRoutes = new Set<DayMarkRoute>([
  "today",
  "calendar",
  "statistics",
  "notes",
  "settings",
  "pomodoro",
]);

export function parseAppRoute(pathname: string): AppRoute {
  if (pathname === "/" || pathname === "") {
    return {
      dayMarkRoute: "today",
      kind: "unknown",
      path: pathname || "/",
    };
  }

  if (pathname === "/login") {
    return {
      dayMarkRoute: "today",
      kind: "login",
      path: pathname,
    };
  }

  if (pathname === "/hub") {
    return {
      dayMarkRoute: "today",
      kind: "hub",
      path: pathname,
    };
  }

  if (pathname === "/money" || pathname.startsWith("/money/")) {
    return {
      dayMarkRoute: "today",
      kind: "money",
      path: pathname,
    };
  }

  if (pathname.startsWith("/daymark")) {
    const segment = pathname.split("/")[2] as DayMarkRoute | undefined;

    return {
      dayMarkRoute: segment && dayMarkRoutes.has(segment) ? segment : "today",
      kind: "daymark",
      path: pathname,
    };
  }

  return {
    dayMarkRoute: "today",
    kind: "unknown",
    path: pathname,
  };
}

export function getDayMarkPath(route: DayMarkRoute) {
  return `/daymark/${route}`;
}
