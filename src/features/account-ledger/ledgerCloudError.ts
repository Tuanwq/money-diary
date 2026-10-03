type CloudError = { code?: string; message?: string; status?: number };

export function describeLedgerCloudError(error: CloudError) {
  const message = error.message?.toLowerCase() ?? "";
  if (error.status === 401 || /jwt|token.*expir|not authenticated/.test(message))
    return "phiên đăng nhập đã hết hạn";
  if (error.status === 403 || error.code === "42501" || /permission denied|row.level security/.test(message))
    return "tài khoản chưa có quyền truy cập dữ liệu cloud";
  if (/failed to fetch|network|timeout|timed out|load failed/.test(message))
    return "không kết nối được tới máy chủ";
  if (error.code === "42703" || error.code === "PGRST204")
    return "cấu trúc dữ liệu cloud chưa được cập nhật";
  return error.code ? `mã lỗi ${error.code}` : "máy chủ chưa phản hồi";
}
