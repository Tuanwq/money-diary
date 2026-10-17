import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { dismissAppToast, getAppToasts, subscribeAppToasts, type AppToast } from "./appToast.ts";
import "./appToast.css";

const icons = { error: AlertCircle, warning: TriangleAlert, success: CheckCircle2, info: Info };
const titles = { error: "Có lỗi xảy ra", warning: "Cần chú ý", success: "Thành công", info: "Thông báo" };

function ToastCard({ toast }: { toast: AppToast }) {
  useEffect(() => {
    if (toast.tone === "error" || toast.actionLabel || toast.secondaryActionLabel) return;
    const timer = window.setTimeout(() => dismissAppToast(toast.id), toast.tone === "success" ? 4500 : 6500);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.tone, toast.actionLabel, toast.secondaryActionLabel]);

  const Icon = icons[toast.tone];
  return <article className={`app-toast is-${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
    <Icon aria-hidden="true" className="app-toast__icon" size={21} />
    <div className="app-toast__body"><strong>{titles[toast.tone]}</strong><p>{toast.message}</p>
      {toast.actionLabel && toast.onAction && <button type="button" className="app-toast__action"
        onClick={() => { dismissAppToast(toast.id); toast.onAction?.(); }}>{toast.actionLabel}</button>}
      {toast.secondaryActionLabel && toast.onSecondaryAction && <button type="button" className="app-toast__action app-toast__action--secondary"
        onClick={() => { dismissAppToast(toast.id); toast.onSecondaryAction?.(); }}>{toast.secondaryActionLabel}</button>}
    </div>
    <button type="button" className="app-toast__close" aria-label="Đóng thông báo"
      onClick={() => dismissAppToast(toast.id)}><X size={18} /></button>
  </article>;
}

export function AppToastViewport() {
  const toasts = useSyncExternalStore(subscribeAppToasts, getAppToasts, getAppToasts);
  if (!toasts.length) return null;
  return createPortal(<div className="app-toast-viewport" aria-label="Thông báo ứng dụng">
    {toasts.map((toast) => <ToastCard key={toast.id} toast={toast} />)}
  </div>, document.body);
}
