import { APP_NOTIFICATION_CONFIG } from "../notifications/config";
import {
  getDevicePushSubscriptionState,
  getNotificationPermission,
} from "../notifications/notificationService";
import type { AppIdentifier } from "../notifications/types";
import {
  getCurrentAppIdentifier,
  registerAppServiceWorker,
} from "../../pwa/appPwa";
import {
  APP_PWA_CONFIGURED_EVENT,
  isAppBuildInfo,
  type AppUpdateDiagnostics,
} from "./appUpdateModel";

export { APP_PWA_CONFIGURED_EVENT };
const APP_VERSION_URL = "/app-version.json";

export function getCurrentBuildInfo() {
  return __APP_BUILD_INFO__;
}

export async function loadRemoteBuildInfo() {
  const url = new URL(APP_VERSION_URL, window.location.origin);

  url.searchParams.set("checkedAt", String(Date.now()));

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Không thể đọc phiên bản mới (${response.status}).`);
  }

  const payload: unknown = await response.json();

  if (!isAppBuildInfo(payload)) {
    throw new Error("Thông tin phiên bản trên máy chủ không hợp lệ.");
  }

  return payload;
}

export async function getCurrentAppRegistration() {
  const appIdentifier = getCurrentAppIdentifier();

  if (!appIdentifier || !("serviceWorker" in navigator)) {
    return null;
  }

  return registerAppServiceWorker(appIdentifier);
}

function getServiceWorkerState(
  registration: ServiceWorkerRegistration | null
): AppUpdateDiagnostics["serviceWorkerState"] {
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (registration?.waiting) return "waiting";
  if (registration?.installing) return "installing";
  return registration?.active ? "active" : "installing";
}

function getStandaloneState() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}

export async function collectAppUpdateDiagnostics(
  registration?: ServiceWorkerRegistration | null
): Promise<AppUpdateDiagnostics> {
  const appIdentifier = getCurrentAppIdentifier();
  const resolvedRegistration =
    registration ?? (await getCurrentAppRegistration());
  const cacheCount =
    "caches" in window ? (await caches.keys()).length : null;
  const pushSubscribed = appIdentifier
    ? await getDevicePushSubscriptionState(appIdentifier)
    : false;

  return {
    appName: appIdentifier
      ? APP_NOTIFICATION_CONFIG[appIdentifier].name
      : "Ứng dụng",
    cacheCount,
    isOnline: navigator.onLine,
    isStandalone: getStandaloneState(),
    notificationPermission: getNotificationPermission(),
    pushSubscribed,
    serviceWorkerState: getServiceWorkerState(resolvedRegistration),
  };
}

export function getAppIdentifierForUpdate(): AppIdentifier | null {
  return getCurrentAppIdentifier();
}

export async function requestServiceWorkerActivation(
  registration: ServiceWorkerRegistration
) {
  await registration.update();

  if (!registration.waiting) return false;

  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}
