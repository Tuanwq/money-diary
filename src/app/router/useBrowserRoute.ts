import { useCallback, useEffect, useState } from "react";
import { parseAppRoute, type AppRoute } from "./routes";

export function useBrowserRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location.pathname)
  );

  useEffect(() => {
    function handlePopState() {
      setRoute(parseAppRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
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
