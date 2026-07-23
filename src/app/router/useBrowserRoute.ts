import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { configurePwaForPath } from "../../pwa/appPwa";
import { parseAppRoute, shouldResetAppScroll, type AppRoute } from "./routes";

export function useBrowserRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location.pathname)
  );
  const previousRouteRef = useRef(route);

  useLayoutEffect(() => {
    const previousRoute = previousRouteRef.current;

    if (shouldResetAppScroll(previousRoute, route)) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    previousRouteRef.current = route;
  }, [route]);

  useEffect(() => {
    void configurePwaForPath(route.path);
  }, [route.path]);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    function handlePopState() {
      setRoute(parseAppRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigateApp = useCallback((path: string, replace = false) => {
    if (window.location.pathname === path) {
      setRoute(parseAppRoute(new URL(path, window.location.origin).pathname));
      return;
    }

    if (replace) {
      window.history.replaceState(window.history.state, "", path);
    } else {
      window.history.pushState(window.history.state, "", path);
    }

    setRoute(parseAppRoute(new URL(path, window.location.origin).pathname));
  }, []);

  return {
    navigateApp,
    route,
  };
}
