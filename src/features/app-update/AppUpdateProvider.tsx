import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Download, RefreshCw, X } from "lucide-react";
import {
  APP_PWA_CONFIGURED_EVENT,
  type AppUpdateDiagnostics,
  type AppUpdateStatus,
} from "./appUpdateModel";
import {
  collectAppUpdateDiagnostics,
  getCurrentAppRegistration,
  getCurrentBuildInfo,
  loadRemoteBuildInfo,
  requestServiceWorkerActivation,
} from "./appUpdateService";
import { hasNewerAppBuild } from "./appUpdateModel";
import {
  AppUpdateContext,
  type AppUpdateContextValue,
} from "./appUpdateContext";
import { captureAppError } from "../error-monitoring/appErrorMonitor";

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Không thể kiểm tra phiên bản mới.";
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const currentBuild = useMemo(() => getCurrentBuildInfo(), []);
  const [diagnostics, setDiagnostics] =
    useState<AppUpdateDiagnostics | null>(null);
  const [error, setError] = useState("");
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);
  const [remoteBuild, setRemoteBuild] = useState<AppBuildInfo | null>(null);
  const [status, setStatus] = useState<AppUpdateStatus>("checking");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const monitoredRegistrationsRef = useRef(
    new WeakSet<ServiceWorkerRegistration>()
  );
  const availableBuildIdRef = useRef("");

  const markUpdateAvailable = useCallback((buildId: string) => {
    if (availableBuildIdRef.current !== buildId) {
      availableBuildIdRef.current = buildId;
      setIsNoticeDismissed(false);
    }

    setStatus("available");
  }, []);

  const monitorRegistration = useCallback(
    (registration: ServiceWorkerRegistration | null) => {
      registrationRef.current = registration;
      if (!registration) return;

      if (registration.waiting) {
        markUpdateAvailable(
          `service-worker:${registration.waiting.scriptURL}`
        );
      }

      if (monitoredRegistrationsRef.current.has(registration)) return;
      monitoredRegistrationsRef.current.add(registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            markUpdateAvailable(`service-worker:${worker.scriptURL}`);
          }
        });
      });
    },
    [markUpdateAvailable]
  );

  const refreshDiagnostics = useCallback(async () => {
    try {
      const nextDiagnostics = await collectAppUpdateDiagnostics(
        registrationRef.current
      );
      setDiagnostics(nextDiagnostics);
    } catch {
      setDiagnostics(null);
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    setError("");
    setStatus((current) =>
      current === "available" || current === "updating"
        ? current
        : "checking"
    );

    let registration: ServiceWorkerRegistration | null = null;

    try {
      registration = await getCurrentAppRegistration();
      monitorRegistration(registration);

      const nextRemoteBuild = await loadRemoteBuildInfo();
      setRemoteBuild(nextRemoteBuild);

      if (
        registration?.waiting ||
        hasNewerAppBuild(currentBuild, nextRemoteBuild)
      ) {
        markUpdateAvailable(
          registration?.waiting
            ? `service-worker:${registration.waiting.scriptURL}`
            : nextRemoteBuild.buildId
        );
      } else if (!("serviceWorker" in navigator)) {
        setStatus("unsupported");
      } else {
        availableBuildIdRef.current = "";
        setStatus("current");
      }
    } catch (updateError) {
      captureAppError({
        category: "pwa",
        error: updateError,
        message: "Không thể kiểm tra phiên bản PWA trên máy chủ",
      });
      if (registration?.waiting) {
        markUpdateAvailable(
          `service-worker:${registration.waiting.scriptURL}`
        );
      } else {
        setError(getErrorMessage(updateError));
        setStatus(
          "serviceWorker" in navigator ? "error" : "unsupported"
        );
      }
    } finally {
      void refreshDiagnostics();
    }
  }, [
    currentBuild,
    markUpdateAvailable,
    monitorRegistration,
    refreshDiagnostics,
  ]);

  const applyUpdate = useCallback(async () => {
    setError("");
    setStatus("updating");

    try {
      const registration =
        registrationRef.current ?? (await getCurrentAppRegistration());

      if (registration) {
        registrationRef.current = registration;

        const controllerChanged = new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 2500);

          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => {
              window.clearTimeout(timeout);
              resolve();
            },
            { once: true }
          );
        });
        const activationRequested =
          await requestServiceWorkerActivation(registration);

        if (activationRequested) await controllerChanged;
      }

      window.location.reload();
    } catch (updateError) {
      captureAppError({
        category: "pwa",
        error: updateError,
        message: "Không thể kích hoạt phiên bản ứng dụng mới",
      });
      setError(getErrorMessage(updateError));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(
      () => void checkForUpdates(),
      0
    );

    const interval = window.setInterval(
      () => void checkForUpdates(),
      UPDATE_CHECK_INTERVAL_MS
    );
    const handlePwaConfigured = () => void checkForUpdates();
    const handleOnline = () => void checkForUpdates();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    window.addEventListener(APP_PWA_CONFIGURED_EVENT, handlePwaConfigured);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener(
        APP_PWA_CONFIGURED_EVENT,
        handlePwaConfigured
      );
      window.removeEventListener("online", handleOnline);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [checkForUpdates]);

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      applyUpdate,
      checkForUpdates,
      currentBuild,
      diagnostics,
      dismissNotice: () => setIsNoticeDismissed(true),
      error,
      isNoticeDismissed,
      refreshDiagnostics,
      remoteBuild,
      status,
    }),
    [
      applyUpdate,
      checkForUpdates,
      currentBuild,
      diagnostics,
      error,
      isNoticeDismissed,
      refreshDiagnostics,
      remoteBuild,
      status,
    ]
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
      {status === "available" && !isNoticeDismissed && (
        <aside
          className="app-update-notice"
          aria-live="polite"
          aria-label="Có phiên bản ứng dụng mới"
        >
          <span className="app-update-notice__icon" aria-hidden="true">
            <Download size={20} />
          </span>
          <div className="app-update-notice__copy">
            <strong>Có phiên bản mới</strong>
            <span>
              Cập nhật để nhận giao diện và chức năng mới nhất.
            </span>
          </div>
          <button
            type="button"
            className="app-update-notice__action"
            onClick={() => void applyUpdate()}
          >
            <RefreshCw aria-hidden="true" size={17} />
            Cập nhật ngay
          </button>
          <button
            type="button"
            className="app-update-notice__close"
            aria-label="Đóng thông báo cập nhật"
            onClick={() => setIsNoticeDismissed(true)}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </aside>
      )}
    </AppUpdateContext.Provider>
  );
}
