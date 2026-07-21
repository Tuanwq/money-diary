type CompactProgressItemProps = {
  detail: string;
  emptyMessage?: string;
  id: string;
  label: string;
  progress: number;
  scope: string;
  value: string;
};

export function CompactProgressItem({
  detail,
  emptyMessage,
  id,
  label,
  progress,
  scope,
  value,
}: CompactProgressItemProps) {
  const safeProgress = Number.isFinite(progress) ? Math.max(progress, 0) : 0;
  const barProgress = Math.min(safeProgress, 100);

  return (
    <article className="money-compact-progress-item" aria-describedby={`${id}-scope`}>
      <div className="money-compact-progress-heading">
        <span className="money-compact-progress-label">{label}</span>
      </div>

      {emptyMessage ? (
        <strong className="money-compact-progress-empty">{emptyMessage}</strong>
      ) : (
        <strong className="money-compact-progress-value">{value}</strong>
      )}

      <p className="money-compact-progress-detail">{detail}</p>

      <div
        className="money-compact-progress-track"
        role="progressbar"
        aria-label={`${label}: ${safeProgress}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barProgress}
      >
        <span style={{ width: `${barProgress}%` }} />
      </div>

      <strong className="money-compact-progress-percent">{safeProgress}%</strong>

      <span id={`${id}-scope`} className="money-visually-hidden">{scope}</span>
    </article>
  );
}
