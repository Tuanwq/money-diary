import { AlertCircle } from "lucide-react";

type DashboardSectionStateProps = {
  error?: string | null;
  isLoading?: boolean;
  onRetry?: () => void;
  variant: "compact" | "goals" | "metrics";
};

export function DashboardSectionState({
  error,
  isLoading,
  onRetry,
  variant,
}: DashboardSectionStateProps) {
  if (isLoading) {
    const skeletonCount = variant === "goals" ? 4 : variant === "metrics" ? 6 : 1;

    return (
      <div
        className={`money-dashboard-skeleton-grid is-${variant}`}
        role="status"
        aria-label="Đang tải dữ liệu"
      >
        {Array.from({ length: skeletonCount }, (_, index) => (
          <span key={index} className="money-dashboard-skeleton-card" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ))}
      </div>
    );
  }

  if (!error) return null;

  return (
    <div className="money-dashboard-section-error" role="alert">
      <AlertCircle aria-hidden="true" size={21} />
      <div>
        <strong>Không tải được dữ liệu tài chính</strong>
        <p>Vui lòng thử tải lại. Dữ liệu đã nhập không bị thay đổi.</p>
      </div>
      {onRetry && (
        <button type="button" className="money-secondary-action" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
