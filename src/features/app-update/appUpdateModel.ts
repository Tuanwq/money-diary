export type AppUpdateStatus =
  | "available"
  | "checking"
  | "current"
  | "error"
  | "unsupported"
  | "updating";

export const APP_PWA_CONFIGURED_EVENT = "app:pwa-configured";

export type AppUpdateDiagnostics = {
  appName: string;
  cacheCount: number | null;
  isOnline: boolean;
  isStandalone: boolean;
  notificationPermission:
    | NotificationPermission
    | "unsupported";
  pushSubscribed: boolean;
  serviceWorkerState:
    | "active"
    | "installing"
    | "unsupported"
    | "waiting";
};

export function isAppBuildInfo(value: unknown): value is AppBuildInfo {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AppBuildInfo>;

  return (
    typeof candidate.buildId === "string" &&
    candidate.buildId.length > 0 &&
    typeof candidate.builtAt === "string" &&
    candidate.builtAt.length > 0 &&
    typeof candidate.commit === "string" &&
    candidate.commit.length > 0 &&
    typeof candidate.version === "string" &&
    candidate.version.length > 0
  );
}

export function hasNewerAppBuild(
  current: AppBuildInfo,
  remote: AppBuildInfo | null
) {
  return Boolean(remote && remote.buildId !== current.buildId);
}
