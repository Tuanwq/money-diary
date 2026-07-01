import { useState } from "react";
import type { DataWarning } from "../utils/dataWarnings";

type DataWarningsPanelProps = {
  warnings: DataWarning[];
  onAction: (warning: DataWarning) => void;
};

const severityDotClass: Record<DataWarning["severity"], string> = {
  info: "bg-slate-400",
  warning: "bg-yellow-400",
  danger: "bg-red-500",
};

export function DataWarningsPanel({
  warnings,
  onAction,
}: DataWarningsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (warnings.length === 0) return null;

  const dangerCount = warnings.filter((item) => item.severity === "danger").length;
  const warningCount = warnings.filter((item) => item.severity === "warning").length;
  const firstWarning = warnings[0];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">Nhắc lỗi dữ liệu</h2>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
              {warnings.length} việc
            </span>

            {dangerCount > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                {dangerCount} lỗi nặng
              </span>
            )}

            {warningCount > 0 && (
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
                {warningCount} cần kiểm tra
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-slate-500">
            Gợi ý đầu tiên: {firstWarning.title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-slate-100"
        >
          {isOpen ? "Thu gọn" : "Xem chi tiết"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 grid gap-2">
          {warnings.map((warning) => (
            <article
              key={warning.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    severityDotClass[warning.severity]
                  }`}
                />

                <div className="min-w-0">
                  <h3 className="font-bold">{warning.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {warning.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAction(warning)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                {warning.actionLabel}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}