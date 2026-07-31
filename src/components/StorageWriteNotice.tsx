import { useEffect, useState } from "react";
import {
  STORAGE_WRITE_WARNING_EVENT,
  type StorageWriteWarningDetail,
} from "../utils/safeStorage";

export function StorageWriteNotice() {
  const [warning, setWarning] = useState<StorageWriteWarningDetail | null>(null);

  useEffect(() => {
    const handleWarning = (event: Event) => {
      setWarning(
        (event as CustomEvent<StorageWriteWarningDetail>).detail
      );
    };

    window.addEventListener(STORAGE_WRITE_WARNING_EVENT, handleWarning);
    return () =>
      window.removeEventListener(STORAGE_WRITE_WARNING_EVENT, handleWarning);
  }, []);

  if (!warning) return null;

  return (
    <aside className="storage-write-notice" role="alert">
      <div>
        <strong>Chưa thể lưu trên thiết bị</strong>
        <p>{warning.message}</p>
      </div>
      <button
        type="button"
        aria-label="Đóng cảnh báo bộ nhớ"
        onClick={() => setWarning(null)}
      >
        Đóng
      </button>
    </aside>
  );
}
