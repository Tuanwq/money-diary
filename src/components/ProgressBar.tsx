type ProgressBarProps = {
  label?: string;
  value: number;
};

export function ProgressBar({ label = "Tiến độ", value }: ProgressBarProps) {
  const safeValue = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);

  return (
    <div
      className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
