import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearPwaShellCaches } from "../pwa/pwaRecovery";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  isRecovering: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    isRecovering: false,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Money Diary gặp lỗi hiển thị", error, errorInfo);
  }

  private reloadInterface = () => {
    window.location.reload();
  };

  private refreshPwa = async () => {
    this.setState({ isRecovering: true });

    try {
      await clearPwaShellCaches();
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            try {
              await registration.update();
            } catch {
              // Cache cleanup and reload are enough for offline worker errors.
            }
          })
        );
      }
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
          <div className="app-error-card__actions">
            <button type="button" onClick={this.reloadInterface}>
              Tải lại giao diện
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={this.state.isRecovering}
              onClick={() => void this.refreshPwa()}
            >
              {this.state.isRecovering
                ? "Đang làm mới..."
                : "Làm mới ứng dụng"}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
