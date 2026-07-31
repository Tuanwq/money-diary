export const STORAGE_WRITE_WARNING_EVENT = "money-diary:storage-write-warning";

export type StorageWriteWarningDetail = {
  key: string;
  message: string;
  quotaExceeded: boolean;
};

const RECOVERABLE_STORAGE_KEYS = [
  "money_diary_app_change_logs",
  "money-diary-hub-change-logs",
  "money_diary_backup_records",
];

export function isStorageQuotaExceeded(error: unknown) {
  if (!(error instanceof DOMException)) return false;

  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function dispatchStorageWarning(detail: StorageWriteWarningDetail) {
  window.dispatchEvent(
    new CustomEvent<StorageWriteWarningDetail>(STORAGE_WRITE_WARNING_EVENT, {
      detail,
    })
  );
}

function reportStorageWriteFailure(key: string, error: unknown) {
  const quotaExceeded = isStorageQuotaExceeded(error);

  console.error(`Không thể lưu localStorage key "${key}"`, error);
  dispatchStorageWarning({
    key,
    message: quotaExceeded
      ? "Bộ nhớ thiết bị đã đầy. Dữ liệu vẫn còn trong phiên hiện tại; hãy đồng bộ cloud hoặc tạo bản sao lưu trước khi tải lại."
      : "Không thể lưu dữ liệu trên thiết bị.",
    quotaExceeded,
  });
}

function clearRecoverableStorage(excludedKey: string) {
  if (RECOVERABLE_STORAGE_KEYS.includes(excludedKey)) return false;

  let removed = false;

  for (const key of RECOVERABLE_STORAGE_KEYS) {
    if (!localStorage.getItem(key)) continue;

    localStorage.removeItem(key);
    removed = true;
  }

  return removed;
}

export function safeSetStorageItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isStorageQuotaExceeded(error)) {
      try {
        const clearedHistory = clearRecoverableStorage(key);

        if (clearedHistory) {
          localStorage.setItem(key, value);
          dispatchStorageWarning({
            key,
            message:
              "Bộ nhớ thiết bị đã đầy nên ứng dụng đã dọn lịch sử hoàn tác cũ. Dữ liệu bạn vừa nhập vẫn được lưu.",
            quotaExceeded: true,
          });
          return true;
        }
      } catch {
        // The original error below contains the useful storage diagnosis.
      }
    }

    reportStorageWriteFailure(key, error);
    return false;
  }
}

export function safeSetStorageJson(key: string, value: unknown) {
  try {
    return safeSetStorageItem(key, JSON.stringify(value));
  } catch (error) {
    reportStorageWriteFailure(key, error);
    return false;
  }
}

export function safeRemoveStorageItem(key: string) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    reportStorageWriteFailure(key, error);
    return false;
  }
}

export function estimateStorageBytes(value: unknown) {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
