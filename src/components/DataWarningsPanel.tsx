import type { DataWarning } from "../utils/dataWarnings";

type DataWarningsPanelProps = {
  warnings: DataWarning[];
  onAction: (warning: DataWarning) => void;
};

const severityClass: Record<DataWarning["severity"], string> = {
  info: "border-slate-200 bg-slate-50",
  warning: "border-yellow-200 bg-yellow-50",
  danger: "border-red-200 bg-red-50",
};

export function DataWarningsPanel({
  warnings,
  onAction,
}: DataWarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Nhắc lỗi dữ liệu</h2>
          <p className="text-sm text-slate-500">
            Các điểm cần kiểm tra để báo cáo và dự đoán đáng tin hơn.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
          {warnings.length} nhắc việc
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {warnings.map((warning) => (
          <article
            key={warning.id}
            className={`rounded-xl border p-4 ${severityClass[warning.severity]}`}
          >
            <h3 className="font-bold">{warning.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {warning.description}
            </p>

            <button
              type="button"
              onClick={() => onAction(warning)}
              className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {warning.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
