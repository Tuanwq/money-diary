export type AppToastTone = "error" | "warning" | "success" | "info";

export type AppToast = {
  id: number;
  message: string;
  tone: AppToastTone;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

type ToastOptions = {
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

let nextId = 0;
let toasts: AppToast[] = [];
const listeners = new Set<() => void>();

function emit() { listeners.forEach((listener) => listener()); }

export function subscribeAppToasts(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getAppToasts() { return toasts; }

export function dismissAppToast(id: number) {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function showAppToast(message: string, tone: AppToastTone = "error", options: ToastOptions = {}) {
  const text = message.trim();
  if (!text) return;
  const existing = toasts.find((toast) => toast.message === text && toast.tone === tone);
  if (existing) return existing.id;
  const id = ++nextId;
  toasts = [...toasts.slice(-2), {
    id, message: text, tone,
    actionLabel: options.actionLabel, onAction: options.onAction,
    secondaryActionLabel: options.secondaryActionLabel, onSecondaryAction: options.onSecondaryAction,
  }];
  emit();
  return id;
}

export function showSuccessToast(message: string) { showAppToast(message, "success"); }
