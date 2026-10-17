import { PopupNotice } from "../../../components/feedback/PopupNotice.tsx";

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
    <><PopupNotice message={message} actionLabel={onRetry ? "Thử lại" : undefined} onAction={onRetry} />
    <div className="history-error-state">
      <h3>Lịch sử tạm thời chưa tải được</h3>
      <p>Dữ liệu cũ vẫn được giữ nguyên nếu có.</p>
      {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
    </div>
    </>
  );
}
