type CloudRenderStateInput = {
  cloudLoaded: boolean;
  hadLocalDataAtMount: boolean;
  syncStatus: string;
  userId?: string;
};

export function getCloudRenderState({
  cloudLoaded,
  hadLocalDataAtMount,
  syncStatus,
  userId,
}: CloudRenderStateInput) {
  const hasDashboardData = hadLocalDataAtMount || cloudLoaded;
  const cloudLoadError =
    !hasDashboardData && syncStatus.startsWith("Lỗi")
      ? syncStatus === "Lỗi tải dữ liệu cloud"
        ? "Không thể gộp dữ liệu cloud. Dữ liệu local vẫn được giữ nguyên."
        : "Dữ liệu đã tải nhưng chưa thể lưu bản gộp lên cloud."
      : null;

  return {
    cloudLoadError,
    hasDashboardData,
    isCloudLoading: Boolean(userId && !hasDashboardData && !cloudLoadError),
  };
}

/** The header may say "Đã đồng bộ" only after every persisted financial store is ready. */
export function getAggregateSyncStatus(primaryStatus: string, storeStatuses: string[], userId?: string) {
  if (!userId) return primaryStatus;
  const statuses = [primaryStatus, ...storeStatuses];
  const error = statuses.find((status) => /migration|chưa thể|lỗi|xung đột/i.test(status));
  if (error) return error;
  return statuses.find((status) => !status.toLocaleLowerCase("vi-VN").trim().endsWith("đã đồng bộ"))
    ?? "Đã đồng bộ";
}
