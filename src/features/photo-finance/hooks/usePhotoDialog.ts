import { useEffect, useRef } from "react";
import { lockPhotoDialog } from "../services/photoDialogLock.ts";

export function usePhotoDialog(isOpen: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const lock = lockPhotoDialog(document.body.style);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && lock.isTop()) {
        event.stopImmediatePropagation();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { lock.release(); document.removeEventListener("keydown", onKey); };
  }, [isOpen]);
}
