import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureAppError } from "../features/error-monitoring/appErrorMonitor";
import { recoverApplicationShell } from "../pwa/pwaRecovery";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  errorCode: string;
  hasError: boolean;
  isRecovering: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    errorCode: "",
    hasError: false,
    isRecovering: false,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Money Diary gặp lỗi hiển thị", error, errorInfo);
    const record = captureAppError({
      category: "render",
      detail: errorInfo.componentStack,
      error,
    });
    this.setState({ errorCode: record.code });
  }

  private reloadInterface = () => {
    window.location.reload();
  };

  private refreshPwa = async () => {
    this.setState({ isRecovering: true });

    try {
      await recoverApplicationShell();
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-screen">
        <section className="app-error-card" role="alert">
          <p className="app-error-card__eyebrow">Money Diary</p>
          <h1>Ứng dụng gặp lỗi hiển thị</h1>
          <p>
            Dữ liệu trên thiết bị không bị xóa. Bạn có thể tải lại giao diện,
            hoặc làm mới cache PWA nếu lỗi vẫn còn.
          </p>
          {this.state.errorCode && (
            <p className="app-error-card__code">
              Mã lỗi: <strong>{this.state.errorCode}</strong>
            </p>
          )}
          <div className="app-error-card__actions">
            <button type="button" onClick={this.reloadInterface}>
              Tải lại giao diện
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={this.state.isRecovering || !navigator.onLine}
              onClick={() => void this.refreshPwa()}
            >
              {this.state.isRecovering
                ? "Đang khôi phục..."
                : "Khôi phục ứng dụng"}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
