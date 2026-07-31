export type AppErrorCategory = "pwa" | "render" | "runtime" | "sync";

export type AppErrorRecord = {
  category: AppErrorCategory;
  code: string;
  commit: string;
  count: number;
  createdAt: string;
  detail: string;
  id: string;
  message: string;
  route: string;
  version: string;
};

const APP_ERROR_STORAGE_KEY = "money_diary_runtime_errors_v1";
const APP_ERROR_CHANGED_EVENT = "money-diary:error-log-changed";
const MAX_ERROR_RECORDS = 30;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

const CATEGORY_PREFIX: Record<AppErrorCategory, string> = {
  pwa: "PWA",
  render: "UI",
  runtime: "JS",
  sync: "SYNC",
};

function sanitize(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).toUpperCase().slice(0, 5).padStart(5, "0");
}

function loadRecords() {
  if (typeof localStorage === "undefined") return [];

  try {
    const saved = localStorage.getItem(APP_ERROR_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AppErrorRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: AppErrorRecord[]) {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(
      APP_ERROR_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_ERROR_RECORDS))
    );
    window.dispatchEvent(new Event(APP_ERROR_CHANGED_EVENT));
  } catch {
    // Ghi lỗi không được phép làm ứng dụng lỗi thêm khi bộ nhớ đã đầy.
  }
}

function getBuildInfo() {
  if (typeof __APP_BUILD_INFO__ === "undefined") {
    return { commit: "unknown", version: "unknown" };
  }

  return {
    commit: __APP_BUILD_INFO__.commit,
    version: __APP_BUILD_INFO__.version,
  };
}

export function captureAppError(input: {
  category: AppErrorCategory;
  detail?: unknown;
  error?: unknown;
  message?: string;
}) {
  const error = input.error;
  const message = sanitize(
    input.message ||
      (error instanceof Error ? error.message : error) ||
      "Lỗi không xác định",
    240
  );
  const detail = sanitize(
    input.detail || (error instanceof Error ? error.stack : ""),
    1200
  );
  const fingerprint = `${input.category}:${message}:${detail.slice(0, 160)}`;
  const code = `MD-${CATEGORY_PREFIX[input.category]}-${hashText(fingerprint)}`;
  const now = new Date().toISOString();
  const records = loadRecords();
  const duplicateIndex = records.findIndex(
    (record) =>
      record.code === code &&
      Date.now() - new Date(record.createdAt).getTime() < DEDUPE_WINDOW_MS
  );

  if (duplicateIndex >= 0) {
    const duplicate = {
      ...records[duplicateIndex],
      count: records[duplicateIndex].count + 1,
      createdAt: now,
    };
    saveRecords([
      duplicate,
      ...records.filter((_, index) => index !== duplicateIndex),
    ]);
    return duplicate;
  }

  const build = getBuildInfo();
  const record: AppErrorRecord = {
    category: input.category,
    code,
    commit: build.commit,
    count: 1,
    createdAt: now,
    detail,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message,
    route:
      typeof window === "undefined"
        ? "unknown"
        : `${window.location.pathname}${window.location.search}`,
    version: build.version,
  };
  saveRecords([record, ...records]);
  return record;
}

export function getAppErrorRecords() {
  return loadRecords();
}

export function clearAppErrorRecords() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(APP_ERROR_STORAGE_KEY);
  window.dispatchEvent(new Event(APP_ERROR_CHANGED_EVENT));
}

export function subscribeToAppErrors(listener: () => void) {
  window.addEventListener(APP_ERROR_CHANGED_EVENT, listener);
  return () => window.removeEventListener(APP_ERROR_CHANGED_EVENT, listener);
}

export function installGlobalErrorMonitoring() {
  window.addEventListener("error", (event) => {
    captureAppError({
      category: "runtime",
      detail: `${event.filename || "unknown"}:${event.lineno || 0}:${event.colno || 0}`,
      error: event.error,
      message: event.message,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureAppError({
      category: "runtime",
      error: event.reason,
      message: "Promise bị từ chối nhưng chưa được xử lý",
    });
  });
}

