import { APP_NOTIFICATION_CONFIG } from "../features/notifications/config";
import type { AppIdentifier } from "../features/notifications/types";

const APP_MANIFEST_ID = "active-app-manifest";
const APP_THEME_ID = "active-app-theme-color";
let legacyPwaCleanup: Promise<void> | null = null;

function getAppIdentifierFromPath(pathname: string): AppIdentifier | null {
  if (pathname === "/money" || pathname.startsWith("/money/")) {
    return "money_diary";
  }

  if (pathname === "/daymark" || pathname.startsWith("/daymark/")) {
    return "daymark";
  }

  return null;
}

function upsertLink(id: string, rel: string, href: string, sizes?: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.href = href;
  if (sizes) link.sizes = sizes;
}

function updateDocumentMetadata(appIdentifier: AppIdentifier) {
  const config = APP_NOTIFICATION_CONFIG[appIdentifier];
  const isMoneyDiary = appIdentifier === "money_diary";
  let manifest = document.getElementById(
    APP_MANIFEST_ID
  ) as HTMLLinkElement | null;

  if (!manifest) {
    manifest = document.createElement("link");
    manifest.id = APP_MANIFEST_ID;
    manifest.rel = "manifest";
    document.head.appendChild(manifest);
  }

  manifest.href = config.manifest;
  document.title = config.name;

  let theme = document.getElementById(APP_THEME_ID) as HTMLMetaElement | null;

  if (!theme) {
    theme = document.createElement("meta");
    theme.id = APP_THEME_ID;
    theme.name = "theme-color";
    document.head.appendChild(theme);
  }

  theme.content = isMoneyDiary ? "#4f7d5b" : "#315c6b";

  const appleTitle = document.getElementById(
    "active-app-apple-title"
  ) as HTMLMetaElement | null;
  if (appleTitle) appleTitle.content = config.name;

  const description = document.getElementById(
    "active-app-description"
  ) as HTMLMetaElement | null;
  if (description) {
    description.content = isMoneyDiary
      ? "Theo dõi thu nhập, chi tiêu và tiến độ các mục tiêu tài chính."
      : "Lập kế hoạch ngày, theo dõi nhiệm vụ và phiên Pomodoro.";
  }

  upsertLink(
    "active-app-favicon-32",
    "icon",
    isMoneyDiary
      ? "/money-diary-favicon-32x32.png"
      : "/favicon-32x32.png",
    "32x32"
  );
  upsertLink(
    "active-app-favicon-16",
    "icon",
    isMoneyDiary
      ? "/money-diary-favicon-16x16.png"
      : "/favicon-16x16.png",
    "16x16"
  );
  upsertLink(
    "active-app-apple-touch",
    "apple-touch-icon",
    isMoneyDiary
      ? "/money-diary-apple-touch-icon.png"
      : "/apple-touch-icon.png",
    "180x180"
  );
}

async function cleanupLegacyPwa() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations.map(async (registration) => {
      const scriptUrl =
        registration.active?.scriptURL ??
        registration.waiting?.scriptURL ??
        registration.installing?.scriptURL ??
        "";
      const isLegacyWorker =
        scriptUrl.endsWith("/sw.js") || scriptUrl.includes("/dev-sw.js");

      if (isLegacyWorker) await registration.unregister();
    })
  );

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(
          (key) =>
            !key.startsWith("money-diary-") &&
            !key.startsWith("daymark-") &&
            (key.includes("workbox") || key.includes("precache"))
        )
        .map((key) => caches.delete(key))
    );
  }
}

export async function registerAppServiceWorker(
  appIdentifier: AppIdentifier
) {
  if (!("serviceWorker" in navigator)) return null;

  legacyPwaCleanup ??= cleanupLegacyPwa();
  await legacyPwaCleanup;

  const config = APP_NOTIFICATION_CONFIG[appIdentifier];
  const registration = await navigator.serviceWorker.register(
    config.serviceWorker,
    {
      scope: config.scope,
      updateViaCache: "none",
    }
  );

  await registration.update();
  const readyRegistration = await navigator.serviceWorker.ready;

  return readyRegistration.scope.endsWith(config.scope) ||
    readyRegistration.scope.endsWith(`${config.scope}/`)
    ? readyRegistration
    : registration;
}

export async function configurePwaForPath(pathname: string) {
  const appIdentifier = getAppIdentifierFromPath(pathname);

  if (!appIdentifier) return;

  updateDocumentMetadata(appIdentifier);

  try {
    await registerAppServiceWorker(appIdentifier);
  } catch (error) {
    console.error("Không thể đăng ký service worker", error);
  }
}

export function getCurrentAppIdentifier() {
  return getAppIdentifierFromPath(window.location.pathname);
}
