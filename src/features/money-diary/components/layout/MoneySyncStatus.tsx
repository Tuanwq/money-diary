import { Cloud, CloudOff, RefreshCw } from "lucide-react";

type MoneySyncStatusProps = {
  isRefreshing: boolean;
  onResolveConflict?: () => void;
  onRetry: () => void;
  syncStatus: string;
};

export function MoneySyncStatus({
  isRefreshing,
  onResolveConflict,
  onRetry,
  syncStatus,
}: MoneySyncStatusProps) {
  const normalizedStatus = syncStatus.toLocaleLowerCase("vi-VN");
  const hasError =
    normalizedStatus.includes("lỗi") ||
    normalizedStatus.includes("chưa thể") ||
    normalizedStatus.includes("thiếu cấu hình") ||
    normalizedStatus.includes("xung đột") ||
    normalizedStatus.includes("migration");
  const isOffline = normalizedStatus.includes("ngoại tuyến");
  const isConflict = normalizedStatus.includes("xung đột");
  const isSyncing =
    isRefreshing || normalizedStatus.includes("đang đồng bộ");
  const isSynced =
    normalizedStatus.includes("đã đồng bộ") ||
    normalizedStatus.includes("và đồng bộ");
  const label = hasError
    ? "Chưa thể đồng bộ"
    : isOffline
      ? "Ngoại tuyến"
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
  const SyncIcon =
    hasError || isOffline ? CloudOff : isSyncing ? RefreshCw : Cloud;
  const className = `money-sync-status ${
    hasError
      ? "is-error"
      : isOffline
        ? "is-offline"
        : isSyncing
          ? "is-refreshing"
          : ""
  }`;

  if (hasError) {
    return (
      <button
        type="button"
        className={`${className} money-sync-status-button`}
        onClick={isConflict && onResolveConflict ? onResolveConflict : onRetry}
        title={`${syncStatus}. Nhấn để ${isConflict ? "xem cách xử lý" : "thử lại"}.`}
        aria-label={`${syncStatus}. ${isConflict ? "Xem cách xử lý" : "Thử đồng bộ lại"}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <SyncIcon aria-hidden="true" size={16} />
        <span>{label}<small className="money-sync-status-detail">{syncStatus}</small></span>
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
