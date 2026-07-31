import {
  Bell,
  Bug,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  HardDrive,
  MonitorSmartphone,
  RefreshCw,
  RotateCcw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  clearAppErrorRecords,
  getAppErrorRecords,
  subscribeToAppErrors,
} from "../error-monitoring/appErrorMonitor";
import { recoverApplicationShell } from "../../pwa/pwaRecovery";
import { useAppUpdate } from "./useAppUpdate";
import type {
  AppUpdateDiagnostics,
  AppUpdateStatus,
} from "./appUpdateModel";

type DiagnosticItem = {
  icon: ReactNode;
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
  value: string;
};

const updateStatusContent: Record<
  AppUpdateStatus,
  { description: string; label: string; tone: string }
> = {
  available: {
    description: "Máy chủ đã có bản dựng mới hơn thiết bị này.",
    label: "Có phiên bản mới",
    tone: "is-warning",
  },
  checking: {
    description: "Đang đối chiếu với phiên bản trên máy chủ.",
    label: "Đang kiểm tra",
    tone: "is-checking",
  },
  current: {
    description: "Thiết bị đang sử dụng bản dựng mới nhất.",
    label: "Đã cập nhật",
    tone: "is-current",
  },
  error: {
    description: "Chưa thể đối chiếu phiên bản với máy chủ.",
    label: "Kiểm tra thất bại",
    tone: "is-error",
  },
  unsupported: {
    description: "Trình duyệt chưa hỗ trợ cập nhật PWA tự động.",
    label: "Cập nhật thủ công",
    tone: "is-warning",
  },
  updating: {
    description: "Đang kích hoạt bản mới và tải lại ứng dụng.",
    label: "Đang cập nhật",
    tone: "is-checking",
  },
};

function formatBuildTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Không xác định";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getServiceWorkerLabel(
  diagnostics: AppUpdateDiagnostics
): DiagnosticItem {
  const content = {
    active: { tone: "success", value: "Đang hoạt động" },
    installing: { tone: "warning", value: "Đang cài đặt" },
    unsupported: { tone: "danger", value: "Không hỗ trợ" },
    waiting: { tone: "warning", value: "Bản mới đang chờ" },
  } as const;
  const current = content[diagnostics.serviceWorkerState];

  return {
    icon: <Server aria-hidden="true" size={18} />,
    label: "Service Worker",
    tone: current.tone,
    value: current.value,
  };
}

function buildDiagnosticItems(
  diagnostics: AppUpdateDiagnostics | null,
  syncStatus?: string
): DiagnosticItem[] {
  if (!diagnostics) {
    return [
      {
        icon: <Server aria-hidden="true" size={18} />,
        label: "Chẩn đoán",
        tone: "warning",
        value: "Chưa đọc được trạng thái",
      },
    ];
  }

  const notificationValue =
    diagnostics.notificationPermission === "unsupported"
      ? "Không hỗ trợ"
      : diagnostics.notificationPermission === "denied"
        ? "Đã bị chặn"
        : diagnostics.pushSubscribed
          ? "Push đang hoạt động"
          : diagnostics.notificationPermission === "granted"
            ? "Đã cấp quyền, chưa có push"
            : "Chưa cấp quyền";
  const notificationTone =
    diagnostics.pushSubscribed
      ? "success"
      : diagnostics.notificationPermission === "denied"
        ? "danger"
        : "warning";
  const normalizedSyncStatus = syncStatus?.toLocaleLowerCase("vi-VN") ?? "";
  const syncTone =
    normalizedSyncStatus.includes("lỗi") ||
    normalizedSyncStatus.includes("chưa thể")
      ? "danger"
      : normalizedSyncStatus.includes("đã đồng bộ")
        ? "success"
        : "neutral";

  return [
    {
      icon: diagnostics.isOnline ? (
        <Wifi aria-hidden="true" size={18} />
      ) : (
        <WifiOff aria-hidden="true" size={18} />
      ),
      label: "Kết nối",
      tone: diagnostics.isOnline ? "success" : "danger",
      value: diagnostics.isOnline ? "Đang trực tuyến" : "Đang ngoại tuyến",
    },
    {
      icon: <MonitorSmartphone aria-hidden="true" size={18} />,
      label: "Chế độ PWA",
      tone: diagnostics.isStandalone ? "success" : "neutral",
      value: diagnostics.isStandalone
        ? "Đã cài trên thiết bị"
        : "Đang dùng trình duyệt",
    },
    getServiceWorkerLabel(diagnostics),
    {
      icon: <HardDrive aria-hidden="true" size={18} />,
      label: "Bộ nhớ đệm",
      tone: "neutral",
      value:
        diagnostics.cacheCount === null
          ? "Không hỗ trợ"
          : `${diagnostics.cacheCount} vùng cache`,
    },
    {
      icon: <Bell aria-hidden="true" size={18} />,
      label: "Thông báo",
      tone: notificationTone,
      value: notificationValue,
    },
    {
      icon: syncStatus ? (
        <Cloud aria-hidden="true" size={18} />
      ) : (
        <Database aria-hidden="true" size={18} />
      ),
      label: "Đồng bộ dữ liệu",
      tone: syncTone,
      value: syncStatus || "Theo tài khoản đang đăng nhập",
    },
  ];
}

export function AppUpdateCenter({ syncStatus }: { syncStatus?: string }) {
  const {
    applyUpdate,
    checkForUpdates,
    currentBuild,
    diagnostics,
    error,
    remoteBuild,
    status,
  } = useAppUpdate();
  const statusContent = updateStatusContent[status];
  const diagnosticItems = buildDiagnosticItems(diagnostics, syncStatus);
  const isBusy = status === "checking" || status === "updating";
  const [runtimeErrors, setRuntimeErrors] = useState(getAppErrorRecords);
  const [copiedCode, setCopiedCode] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(
    () => subscribeToAppErrors(() => setRuntimeErrors(getAppErrorRecords())),
    []
  );

  async function copyErrorCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 1500);
    } catch {
      setCopiedCode("");
    }
  }

  async function recoverApplication() {
    if (!navigator.onLine) return;
    setIsRecovering(true);

    try {
      await recoverApplicationShell();
    } finally {
      window.location.reload();
    }
  }

  return (
    <section className="app-update-center">
      <header className="app-update-center__header">
        <div>
          <span className="app-update-center__eyebrow">
            <Download aria-hidden="true" size={17} />
            Hệ thống
          </span>
          <h2>Trung tâm cập nhật</h2>
          <p>
            Kiểm tra phiên bản, trạng thái PWA và các dịch vụ trên thiết bị này.
          </p>
        </div>
        <span
          className={`app-update-center__status ${statusContent.tone}`}
          aria-live="polite"
        >
          {status === "current" ? (
            <CheckCircle2 aria-hidden="true" size={16} />
          ) : (
            <RefreshCw
              aria-hidden="true"
              className={isBusy ? "is-spinning" : ""}
              size={16}
            />
          )}
          {statusContent.label}
        </span>
      </header>

      <div className="app-update-center__summary">
        <div className="app-update-center__summary-copy">
          <strong>{statusContent.label}</strong>
          <span>{statusContent.description}</span>
          {error && <span className="is-error">{error}</span>}
        </div>
        <div className="app-update-center__actions">
          <button
            type="button"
            className="notification-secondary-button"
            disabled={isBusy}
            onClick={() => void checkForUpdates()}
          >
            <RefreshCw
              aria-hidden="true"
              className={status === "checking" ? "is-spinning" : ""}
              size={17}
            />
            Kiểm tra lại
          </button>
          {status === "available" && (
            <button
              type="button"
              className="notification-primary-button"
              onClick={() => void applyUpdate()}
            >
              <Download aria-hidden="true" size={17} />
              Cập nhật ngay
            </button>
          )}
        </div>
      </div>

      <dl className="app-update-center__builds">
        <div>
          <dt>Phiên bản đang dùng</dt>
          <dd>v{currentBuild.version}</dd>
        </div>
        <div>
          <dt>Commit</dt>
          <dd>{currentBuild.commit}</dd>
        </div>
        <div>
          <dt>Thời điểm build</dt>
          <dd>{formatBuildTime(currentBuild.builtAt)}</dd>
        </div>
        <div>
          <dt>Phiên bản máy chủ</dt>
          <dd>
            {remoteBuild
              ? `v${remoteBuild.version} · ${remoteBuild.commit}`
              : "Chưa kiểm tra"}
          </dd>
        </div>
      </dl>

      <div className="app-update-center__diagnostics">
        {diagnosticItems.map((item) => (
          <div
            key={item.label}
            className={`app-update-diagnostic is-${item.tone}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </span>
          </div>
        ))}
      </div>

      <section className="app-runtime-errors" aria-labelledby="runtime-error-title">
        <header className="app-runtime-errors__header">
          <div>
            <span className="app-update-center__eyebrow">
              <Bug aria-hidden="true" size={17} />
              Theo dõi lỗi thực tế
            </span>
            <h3 id="runtime-error-title">Lỗi gần đây trên thiết bị</h3>
            <p>Mã lỗi kèm đúng phiên bản giúp xác định thiết bị đang dùng bản nào.</p>
          </div>
          <div className="app-runtime-errors__actions">
            {runtimeErrors.length > 0 && (
              <button
                type="button"
                className="notification-secondary-button"
                onClick={() => clearAppErrorRecords()}
              >
                Xóa lịch sử lỗi
              </button>
            )}
            <button
              type="button"
              className="notification-secondary-button"
              disabled={isRecovering || diagnostics?.isOnline === false}
              onClick={() => void recoverApplication()}
              title="Xóa cache giao diện, cập nhật service worker và giữ nguyên dữ liệu"
            >
              <RotateCcw aria-hidden="true" size={17} />
              {isRecovering ? "Đang khôi phục..." : "Khôi phục ứng dụng"}
            </button>
          </div>
        </header>

        {runtimeErrors.length === 0 ? (
          <div className="app-runtime-errors__empty">
            <CheckCircle2 aria-hidden="true" size={18} />
            Chưa ghi nhận lỗi trên thiết bị này.
          </div>
        ) : (
          <div className="app-runtime-errors__list">
            {runtimeErrors.slice(0, 5).map((record) => (
              <article className={`app-runtime-error is-${record.category}`} key={record.id}>
                <div className="app-runtime-error__main">
                  <button
                    type="button"
                    className="app-runtime-error__code"
                    onClick={() => void copyErrorCode(record.code)}
                    title="Sao chép mã lỗi"
                  >
                    <Copy aria-hidden="true" size={14} />
                    {copiedCode === record.code ? "Đã sao chép" : record.code}
                  </button>
                  <strong>{record.message}</strong>
                  <span>
                    v{record.version} · {record.commit} · {new Date(record.createdAt).toLocaleString("vi-VN")}
                    {record.count > 1 ? ` · lặp ${record.count} lần` : ""}
                  </span>
                </div>
                <span className="app-runtime-error__route">{record.route}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="app-update-center__note">
        Cập nhật hoặc khôi phục giao diện không xóa nhật ký, mục tiêu hay dữ liệu trên thiết bị.
      </p>
    </section>
  );
}
