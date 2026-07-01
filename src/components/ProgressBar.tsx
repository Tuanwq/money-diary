type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
