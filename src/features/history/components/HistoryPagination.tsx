type HistoryPaginationProps = {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
};

export function HistoryPagination({ currentPage, onPageChange, totalPages }: HistoryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="history-pagination" aria-label="Phân trang lịch sử">
      <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
        Trước
      </button>
      <span>Trang {currentPage}/{totalPages}</span>
      <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
        Sau
      </button>
    </nav>
  );
}
