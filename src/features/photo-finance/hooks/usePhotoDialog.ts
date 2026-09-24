import { useEffect, useRef } from "react";
import { lockPhotoDialog } from "../services/photoDialogLock.ts";

export function usePhotoDialog(isOpen: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const lock = lockPhotoDialog(document.body.style);
    const dialogPageState = window.history.state;
    const dialogPageUrl = window.location.href;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && lock.isTop()) {
        event.stopImmediatePropagation();
        close.current();
      }
    };
    const onBrowserBack = (event: PopStateEvent) => {
      if (!lock.isTop()) return;
      // The native Back gesture closes the top photo dialog before leaving its page.
      // Restore the journal entry before the app's route listeners process the pop.
      event.stopImmediatePropagation();
      window.history.pushState(dialogPageState, "", dialogPageUrl);
      close.current();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onBrowserBack, true);
    return () => {
      lock.release();
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onBrowserBack, true);
    };
  }, [isOpen]);
}
