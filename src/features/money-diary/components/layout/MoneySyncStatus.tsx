import { Cloud, CloudOff, RefreshCw } from "lucide-react";

type MoneySyncStatusProps = {
  isRefreshing: boolean;
  onRetry: () => void;
  syncStatus: string;
};

export function MoneySyncStatus({
  isRefreshing,
  onRetry,
  syncStatus,
}: MoneySyncStatusProps) {
  const normalizedStatus = syncStatus.toLocaleLowerCase("vi-VN");
  const hasError =
    normalizedStatus.includes("lỗi") ||
    normalizedStatus.includes("chưa thể") ||
    normalizedStatus.includes("thiếu cấu hình");
  const isSyncing = isRefreshing;
  const isSynced = normalizedStatus.includes("đã đồng bộ");
  const label = hasError
    ? "Chưa thể đồng bộ"
    : isSyncing
      ? "Đang đồng bộ"
      : normalizedStatus.includes("đang tải")
        ? "Đang tải"
        : normalizedStatus.includes("đang lưu")
          ? "Đang lưu"
          : normalizedStatus.includes("thay đổi") ||
              normalizedStatus.includes("chờ đồng bộ")
            ? "Chờ đồng bộ"
            : isSynced
              ? "Đã đồng bộ"
              : "Chưa đồng bộ";
  const SyncIcon = hasError ? CloudOff : isSyncing ? RefreshCw : Cloud;
  const className = `money-sync-status ${
    hasError ? "is-error" : isSyncing ? "is-refreshing" : ""
  }`;

  if (hasError) {
    return (
      <button
        type="button"
        className={`${className} money-sync-status-button`}
        onClick={onRetry}
        title={`${label}. Nhấn để thử lại.`}
        aria-label={`${label}. Thử đồng bộ lại`}
        aria-live="polite"
        aria-atomic="true"
      >
        <SyncIcon aria-hidden="true" size={16} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <span
      className={className}
      title={syncStatus}
      aria-live="polite"
      aria-atomic="true"
    >
      <SyncIcon aria-hidden="true" size={16} />
      <span>{label}</span>
    </span>
  );
}
