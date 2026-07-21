type HistoryErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function HistoryLoadingState() {
  return (
    <div className="history-loading-state" role="status" aria-label="Đang tải lịch sử">
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}

export function HistoryErrorState({ message, onRetry }: HistoryErrorStateProps) {
  return (
    <div className="history-error-state" role="alert">
      <h3>{message}</h3>
      <p>Dữ liệu cũ vẫn được giữ nguyên nếu có.</p>
      {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
