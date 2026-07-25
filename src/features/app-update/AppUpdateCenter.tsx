import {
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  HardDrive,
  MonitorSmartphone,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
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

      <p className="app-update-center__note">
        Cập nhật ứng dụng không xóa nhật ký, mục tiêu hoặc dữ liệu đã đồng bộ.
      </p>
    </section>
  );
}
