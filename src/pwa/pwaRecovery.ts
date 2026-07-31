const PWA_RECOVERY_SESSION_KEY = "money-diary:pwa-recovery-attempt";
const RECOVERY_COOLDOWN_MS = 30_000;

const RECOVERABLE_ASSET_ERROR =
  /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

function getErrorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  return "";
}

function canAttemptRecovery() {
  try {
    const previousAttempt = Number(
      sessionStorage.getItem(PWA_RECOVERY_SESSION_KEY) ?? 0
    );
    return Date.now() - previousAttempt > RECOVERY_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markRecoveryAttempt() {
  try {
    sessionStorage.setItem(PWA_RECOVERY_SESSION_KEY, String(Date.now()));
  } catch {
    // Recovery must still work when browser storage is unavailable.
  }
}

export async function clearPwaShellCaches() {
  if (!("caches" in window)) return;

  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys
      .filter(
        (key) =>
          key.startsWith("money-diary-") || key.startsWith("daymark-")
      )
      .map((key) => caches.delete(key))
  );
}

async function recoverFromStaleAsset() {
  if (!canAttemptRecovery()) return;

  markRecoveryAttempt();

  try {
    await clearPwaShellCaches();
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.update();
          } catch {
            // Reloading still lets the active worker serve a fresh navigation.
          }
        })
      );
    }
  } finally {
    window.location.reload();
  }
}

export function installPwaRecovery() {
  const handlePreloadError = (event: Event) => {
    event.preventDefault();
    void recoverFromStaleAsset();
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!RECOVERABLE_ASSET_ERROR.test(getErrorMessage(event.reason))) return;

    event.preventDefault();
    void recoverFromStaleAsset();
  };

  window.addEventListener("vite:preloadError", handlePreloadError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(PWA_RECOVERY_SESSION_KEY);
    } catch {
      // No cleanup is needed when sessionStorage is unavailable.
    }
  }, RECOVERY_COOLDOWN_MS);
}
