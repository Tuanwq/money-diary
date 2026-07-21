export type HistorySummaryItem = {
  detail?: string;
  label: string;
  value: string;
};

export function HistorySummaryStrip({ isLoading = false, items }: { isLoading?: boolean; items: HistorySummaryItem[] }) {
  if (isLoading) {
    return (
      <div className="history-summary-strip is-loading" role="status" aria-label="Đang tải số liệu tổng hợp">
        {items.map((item) => <span key={item.label} aria-hidden="true" />)}
      </div>
    );
  }

  return (
    <dl className="history-summary-strip">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.detail && <span>{item.detail}</span>}
        </div>
      ))}
    </dl>
  );
}
