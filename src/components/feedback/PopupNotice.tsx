import { useEffect, useRef } from "react";
import { dismissAppToast, showAppToast, type AppToastTone } from "./appToast.ts";

/** Raises an existing component error/status as a shared popup without keeping a second banner. */
export function PopupNotice({ message, tone = "error", actionLabel, onAction,
  secondaryActionLabel, onSecondaryAction }: {
  message: string;
  tone?: AppToastTone;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  const actionRef = useRef(onAction);
  const secondaryActionRef = useRef(onSecondaryAction);
  useEffect(() => {
    actionRef.current = onAction;
    secondaryActionRef.current = onSecondaryAction;
  }, [onAction, onSecondaryAction]);
  useEffect(() => {
    if (!message) return;
    const id = showAppToast(message, tone, {
      actionLabel, onAction: actionLabel ? () => actionRef.current?.() : undefined,
      secondaryActionLabel,
      onSecondaryAction: secondaryActionLabel ? () => secondaryActionRef.current?.() : undefined,
    });
    return () => { if (id) dismissAppToast(id); };
  }, [message, tone, actionLabel, secondaryActionLabel]);
  return null;
}
