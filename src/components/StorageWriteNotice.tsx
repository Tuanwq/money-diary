import { useEffect } from "react";
import { showAppToast } from "./feedback/appToast.ts";
import {
  STORAGE_WRITE_WARNING_EVENT,
  type StorageWriteWarningDetail,
} from "../utils/safeStorage";

export function StorageWriteNotice() {
  useEffect(() => {
    const handleWarning = (event: Event) => {
      showAppToast((event as CustomEvent<StorageWriteWarningDetail>).detail.message);
    };

    window.addEventListener(STORAGE_WRITE_WARNING_EVENT, handleWarning);
    return () =>
      window.removeEventListener(STORAGE_WRITE_WARNING_EVENT, handleWarning);
  }, []);
  return null;
}
