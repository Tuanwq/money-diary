import { useMemo, useState } from "react";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../types";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  AI_FINANCE_RANGE_OPTIONS,
  buildAiFinanceAnalysis,
  type AiFinanceRange,
} from "../utils/aiFinanceAnalysis";
import { formatDateShort } from "../utils/date";

type AiFinanceInsightProps = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  goals: Goals;
  today: string;
};

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;

    try {
      const payload = (await response.clone().json()) as {
        error?: unknown;
        message?: unknown;
      };
      const detail = payload.error ?? payload.message ?? payload;

      if (typeof detail === "string") {
        return `HTTP ${response.status}: ${detail}`;
      }

      return `HTTP ${response.status}: ${JSON.stringify(detail, null, 2)}`;
    } catch {
      try {
        const detail = await response.clone().text();

        if (detail) return `HTTP ${response.status}: ${detail}`;
      } catch {
        return `HTTP ${response.status}: ${error.message}`;
      }
    }

    return `HTTP ${response.status}: ${error.message}`;
  }

  if (error instanceof Error) return error.message;

  return "Không đọc được lỗi từ Edge Function.";
}

export function AiFinanceInsight({
  entries,
  expenses,
  balanceChecks,
  goals,
  today,
}: AiFinanceInsightProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<AiFinanceRange>("last7");
  const [realAiText, setRealAiText] = useState("");
  const [realAiError, setRealAiError] = useState("");
  const [isRealAiLoading, setIsRealAiLoading] = useState(false);
  const analysis = useMemo(
    () =>
      buildAiFinanceAnalysis({
        entries,
        expenses,
        balanceChecks,
        goals,
        today,
        range,
      }),
    [balanceChecks, entries, expenses, goals, range, today]
  );

  async function runRealAiAnalysis() {
    setIsRealAiLoading(true);
    setRealAiError("");
    setRealAiText("");

    const { data, error } = await supabase.functions.invoke<{
      text?: string;
      error?: string;
    }>("analyze-finance", {
      body: {
        range,
        analysis,
      },
    });

    setIsRealAiLoading(false);

    if (error) {
      setRealAiError(await getFunctionErrorMessage(error));
      return;
    }

    if (data?.error) {
      setRealAiError(data.error);
      return;
    }

    setRealAiText(data?.text ?? "AI chưa trả về nội dung.");
  }

  function selectRange(nextRange: AiFinanceRange) {
    setRange(nextRange);
    setRealAiText("");
    setRealAiError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-700"
      >
        Phân tích tài chính 
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-h-[92vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {analysis.rangeLabel}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {analysis.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateShort(analysis.fromDate)} -{" "}
                  {formatDateShort(analysis.toDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                {AI_FINANCE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectRange(option.value)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      range === option.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={runRealAiAnalysis}
                  disabled={isRealAiLoading}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRealAiLoading ? "Đang gọi AI..." : "Gọi AI thật"}
                </button>
              </div>

              <section className="mt-4 rounded-xl bg-slate-100 p-4">
                <p className="text-sm font-medium leading-6 text-slate-700">
                  {analysis.summary}
                </p>
              </section>

              <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-xl border bg-white p-3"
                  >
                    <p className="text-xs font-medium text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-1 break-words text-lg font-black text-slate-900">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {metric.detail}
                    </p>
                  </article>
                ))}
              </section>

              <section className="mt-4 grid gap-3 lg:grid-cols-3">
                <InsightList title="Điểm tốt" items={analysis.highlights} />
                <InsightList title="Cần chú ý" items={analysis.risks} />
                <InsightList title="Nên làm tiếp" items={analysis.actions} />
              </section>

              {(realAiError || realAiText || isRealAiLoading) && (
                <section className="mt-4 rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900">
                      Gọi AI phân tích 
                    </h3>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      Supabase Edge Function
                    </span>
                  </div>

                  {isRealAiLoading && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Đang gửi số liệu tổng hợp lên AI...
                    </p>
                  )}

                  {realAiError && (
                    <p className="mt-3 whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-600">
                      {realAiError}
                    </p>
                  )}

                  {realAiText && (
                    <div className="mt-3 whitespace-pre-line rounded-lg bg-blue-50 px-3 py-3 text-sm leading-6 text-slate-800">
                      {realAiText}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-xl border bg-white p-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p
            key={item}
            className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
          >
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
