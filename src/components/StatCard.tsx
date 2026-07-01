import { ProgressBar } from "./ProgressBar";

type StatCardProps = {
  title: string;
  value: string;
  target: string;
  progress: number;
};

export function StatCard({ title, value, target, progress }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs text-slate-500 sm:text-sm">{title}</p>

      <h2 className="mt-2 break-words text-xl font-bold text-slate-900 sm:text-2xl">
        {value}
      </h2>

      <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
        Mục tiêu: {target}
      </p>

      <ProgressBar value={progress} />

      <p className="mt-2 text-xs font-medium sm:text-sm">{progress}%</p>
    </div>
  );
}
