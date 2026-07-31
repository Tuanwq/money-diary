const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function isLocalRuntime() {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  return LOCAL_HOSTNAMES.has(window.location.hostname);
}

const localCloudSyncOptIn =
  import.meta.env.VITE_ENABLE_LOCAL_CLOUD_SYNC?.trim().toLowerCase() === "true";

export const isCloudDataSyncEnabled =
  !isLocalRuntime() || localCloudSyncOptIn;

export const isMoneyCloudSyncEnabled = isCloudDataSyncEnabled;

export const LOCAL_ONLY_SYNC_STATUS = "Chỉ lưu trên thiết bị";
