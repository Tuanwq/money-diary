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
