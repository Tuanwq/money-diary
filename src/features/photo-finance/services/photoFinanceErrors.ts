type ErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  statusCode?: number | string;
};

function errorLike(cause: unknown): ErrorLike {
  if (cause instanceof Error) return cause;
  if (cause && typeof cause === "object") return cause as ErrorLike;
  return { message: String(cause ?? "") };
}

export function isRetryablePhotoError(cause: unknown) {
  const error = errorLike(cause);
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  const status = Number(error.status ?? error.statusCode ?? 0);
  return status === 408 || status === 429 || status >= 500 ||
    /timeout|timed out|network|fetch|connection|econn|temporar|load failed|failed to load|offline/.test(text);
}

export function photoFinanceErrorMessage(cause: unknown, fallback = "Không thể lưu ảnh.") {
  const error = errorLike(cause);
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  const status = Number(error.status ?? error.statusCode ?? 0);

  if (/42p01|pgrst205|schema cache|financial_attachments/.test(text))
    return "Kho ảnh chưa được cài đặt trên Supabase. Hãy áp dụng migration Photo Finance rồi thử lại.";
  if (/bucket.*not found|not found.*bucket|no such bucket/.test(text))
    return "Kho lưu ảnh riêng tư chưa được tạo trên Supabase. Hãy áp dụng migration Photo Finance rồi thử lại.";
  if (/row-level security|rls|permission denied|unauthorized|jwt/.test(text) || status === 401 || status === 403)
    return "Phiên đăng nhập không còn quyền lưu ảnh. Hãy đăng nhập lại rồi thử lại.";
  if (isRetryablePhotoError(cause))
    return "Kết nối Supabase quá chậm. Giao dịch không bị tạo lại; hãy giữ màn hình này và bấm tải ảnh lại.";
  return error.message?.trim() || fallback;
}

export async function retryPhotoOperation<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await operation(); }
    catch (cause) {
      lastError = cause;
      if (attempt === retries || !isRetryablePhotoError(cause)) throw cause;
      await new Promise((resolve) => globalThis.setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}
