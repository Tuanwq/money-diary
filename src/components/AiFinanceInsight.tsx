import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CalendarRange,
  ChartNoAxesCombined,
  Cloud,
  FileText,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  MessageCircleQuestion,
  ReceiptText,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Truck,
  WandSparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  Goals,
  Page,
} from "../types";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  DEFAULT_HUB_SETTINGS,
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "../constants/hanoiHub";
import { supabase } from "../lib/supabase";
import type { HubEntry, HubSettings } from "../types/hub";
import {
  answerAiFinanceQuestionDetailed,
  buildAiAutomationInsights,
  type AiAutomationInsights,
  type AiFinanceReportSection,
} from "../utils/aiAutomation";
import {
  AI_FINANCE_RANGE_OPTIONS,
  buildAiFinanceAnalysis,
  type AiFinanceRange,
} from "../utils/aiFinanceAnalysis";
import { formatDateShort } from "../utils/date";
import type {
  CashFlowGoalCommitment,
  CashFlowPlan,
} from "../features/cash-flow/cashFlowForecastModel";
import {
  FinanceActionPlanView,
  FinanceAnomalyView,
  FinanceComparisonView,
  FinanceSimulationView,
} from "./FinancialDecisionViews";
import "./AiFinanceInsight.css";

export type AiFinanceInsightProps = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  goals: Goals;
  cashFlowCurrentBalance?: number;
  cashFlowGoalCommitments?: CashFlowGoalCommitment[];
  cashFlowPlans?: CashFlowPlan[];
  hideTrigger?: boolean;
  initialOpen?: boolean;
  onNavigate?: (page: Page, date?: string) => void;
  today: string;
};

type AiInsightView =
  | "analysis"
  | "report"
  | "plan"
  | "anomalies"
  | "simulation"
  | "qa";
type ReportMode = "week" | "month";

const AI_INSIGHT_VIEWS: Array<{
  icon: LucideIcon;
  label: string;
  value: AiInsightView;
}> = [
  { icon: ChartNoAxesCombined, label: "So sánh", value: "analysis" },
  { icon: ShieldAlert, label: "Bất thường", value: "anomalies" },
  { icon: CalendarClock, label: "Kế hoạch", value: "plan" },
  { icon: SlidersHorizontal, label: "Mô phỏng", value: "simulation" },
  { icon: FileText, label: "Báo cáo", value: "report" },
  { icon: MessageCircleQuestion, label: "Hỏi đáp", value: "qa" },
];

const AI_REPORT_SECTION_ICONS: Record<
  AiFinanceReportSection["id"],
  LucideIcon
> = {
  expense: ReceiptText,
  hub: Truck,
  overview: LayoutDashboard,
  performance: Gauge,
  recommendation: Lightbulb,
};

function loadLocalJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallback;

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

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
  cashFlowCurrentBalance,
  cashFlowGoalCommitments = [],
  cashFlowPlans = [],
  entries,
  expenses,
  balanceChecks,
  goals,
  hideTrigger = false,
  initialOpen = false,
  onNavigate,
  today,
}: AiFinanceInsightProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [view, setView] = useState<AiInsightView>("analysis");
  const [range, setRange] = useState<AiFinanceRange>("last7");
  const [reportMode, setReportMode] = useState<ReportMode>("week");
  const [question, setQuestion] = useState("");
  const [realAiText, setRealAiText] = useState("");
  const [realAiError, setRealAiError] = useState("");
  const [isRealAiLoading, setIsRealAiLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hubData = useMemo(() => {
    if (!isOpen) {
      return {
        entries: [] as HubEntry[],
        settings: DEFAULT_HUB_SETTINGS,
      };
    }

    return {
      entries: loadLocalJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, []),
      settings: {
        ...DEFAULT_HUB_SETTINGS,
        ...loadLocalJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {}),
      },
    };
  }, [isOpen]);
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
  const automation = useMemo(
    () =>
      buildAiAutomationInsights({
        entries,
        expenses,
        balanceChecks,
        goals,
        today,
        hubEntries: hubData.entries,
        hubSettings: hubData.settings,
      }),
    [
      balanceChecks,
      entries,
      expenses,
      goals,
      hubData.entries,
      hubData.settings,
      today,
    ]
  );
  const localQuestionResult = useMemo(() => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return {
        answer: "",
        evidence: [] as string[],
      };
    }

    return answerAiFinanceQuestionDetailed({
      question: trimmedQuestion,
      entries,
      expenses,
      balanceChecks,
      goals,
      today,
      hubEntries: hubData.entries,
      hubSettings: hubData.settings,
    });
  }, [
    balanceChecks,
    entries,
    expenses,
    goals,
    hubData.entries,
    hubData.settings,
    question,
    today,
  ]);
  const selectedReport =
    reportMode === "week" ? automation.weeklyReport : automation.monthlyReport;
  const selectedReportSections =
    reportMode === "week"
      ? automation.weeklyReportSections
      : automation.monthlyReportSections;
  useEffect(() => {
    function openFromMoneyNavigation() {
      setIsOpen(true);
    }

    window.addEventListener("money-diary:open-ai", openFromMoneyNavigation);

    return () => {
      window.removeEventListener("money-diary:open-ai", openFromMoneyNavigation);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
        mode: view,
        question: question.trim(),
        analysis,
        automation,
        verifiedAnswer: localQuestionResult,
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

  function selectView(nextView: AiInsightView) {
    setView(nextView);
    setRealAiText("");
    setRealAiError("");
  }

  function navigateFromInsight(page: Page, date?: string) {
    setIsOpen(false);
    onNavigate?.(page, date);
  }

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="app-primary-button ai-finance-trigger"
        >
          <Sparkles aria-hidden="true" size={17} />
          Phân tích tài chính
        </button>
      )}

      {isOpen && (
        <div
          className="ai-finance-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            aria-labelledby="ai-finance-title"
            aria-modal="true"
            className="ai-finance-dialog"
            role="dialog"
            tabIndex={-1}
          >
            <header className="ai-finance-header">
              <div className="ai-finance-header-icon" aria-hidden="true">
                <Bot size={24} />
              </div>
              <div className="ai-finance-header-copy">
                <span>{analysis.rangeLabel}</span>
                <h2 id="ai-finance-title">{analysis.title}</h2>
                <p>
                  <CalendarRange aria-hidden="true" size={14} />
                  {formatDateShort(analysis.fromDate)} -{" "}
                  {formatDateShort(analysis.toDate)}
                </p>
              </div>
              <button
                aria-label="Đóng phân tích tài chính"
                className="ai-finance-close-button"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>

            <nav className="ai-finance-view-tabs" aria-label="Nội dung phân tích">
              {AI_INSIGHT_VIEWS.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    aria-current={view === option.value ? "page" : undefined}
                    className={view === option.value ? "is-active" : ""}
                    type="button"
                    onClick={() => selectView(option.value)}
                  >
                    <Icon aria-hidden="true" size={16} />
                    {option.label}
                  </button>
                );
              })}
            </nav>

            <div className="ai-finance-toolbar">
              <div
                className="ai-finance-range-options"
                role="group"
                aria-label="Khoảng dữ liệu"
              >
                {AI_FINANCE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    aria-pressed={range === option.value}
                    className={range === option.value ? "is-active" : ""}
                    type="button"
                    onClick={() => selectRange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="ai-finance-toolbar-actions">
                <button
                  className="ai-finance-run-button"
                  type="button"
                  onClick={runRealAiAnalysis}
                  disabled={isRealAiLoading}
                >
                  {isRealAiLoading ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="is-spinning"
                      size={17}
                    />
                  ) : (
                    <WandSparkles aria-hidden="true" size={17} />
                  )}
                  {isRealAiLoading ? "Đang phân tích" : "Phân tích với AI"}
                </button>
              </div>
            </div>

            <div className="ai-finance-content">
              {view === "analysis" && (
                <FinanceComparisonView analysis={analysis} />
              )}

              {view === "report" && (
                <AiReportView
                  automation={automation}
                  reportMode={reportMode}
                  selectedReport={selectedReport}
                  selectedReportSections={selectedReportSections}
                  setReportMode={setReportMode}
                />
              )}

              {view === "plan" && (
                <FinanceActionPlanView
                  items={analysis.actionPlan}
                  onNavigate={onNavigate ? navigateFromInsight : undefined}
                />
              )}

              {view === "anomalies" && (
                <FinanceAnomalyView
                  anomalies={analysis.anomalies}
                  onNavigate={onNavigate ? navigateFromInsight : undefined}
                />
              )}

              {view === "simulation" && (
                <FinanceSimulationView
                  currentBalance={
                    cashFlowCurrentBalance ??
                    goals.bigGoalSaved +
                      analysis.facts.totalIncome -
                      analysis.facts.totalExpense
                  }
                  entries={entries}
                  expenses={expenses}
                  goalCommitments={cashFlowGoalCommitments}
                  goals={goals}
                  onNavigate={onNavigate ? navigateFromInsight : undefined}
                  plans={cashFlowPlans}
                  today={today}
                />
              )}

              {view === "qa" && (
                <AiQuestionAnswerView
                  answer={localQuestionResult.answer}
                  evidence={localQuestionResult.evidence}
                  question={question}
                  setQuestion={setQuestion}
                  suggestedQuestions={automation.suggestedQuestions}
                />
              )}

              {(realAiError || realAiText || isRealAiLoading) && (
                <section className="ai-finance-real-ai" aria-live="polite">
                  <header>
                    <div>
                      <span aria-hidden="true">
                        <WandSparkles size={17} />
                      </span>
                      <h3>Phân tích chuyên sâu</h3>
                    </div>
                    <span className="ai-finance-cloud-badge">
                      <Cloud aria-hidden="true" size={14} />
                      AI cloud
                    </span>
                  </header>

                  {isRealAiLoading && (
                    <p className="ai-finance-ai-status">
                      <LoaderCircle
                        aria-hidden="true"
                        className="is-spinning"
                        size={17}
                      />
                      Đang gửi số liệu tổng hợp lên AI...
                    </p>
                  )}

                  {realAiError && (
                    <p className="ai-finance-ai-error">
                      <AlertTriangle aria-hidden="true" size={17} />
                      {realAiError}
                    </p>
                  )}

                  {realAiText && (
                    <div className="ai-finance-ai-answer">
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

function AiReportView({
  automation,
  reportMode,
  selectedReport,
  selectedReportSections,
  setReportMode,
}: {
  automation: AiAutomationInsights;
  reportMode: ReportMode;
  selectedReport: string;
  selectedReportSections: AiFinanceReportSection[];
  setReportMode: (mode: ReportMode) => void;
}) {
  return (
    <section className="ai-finance-report-view">
      <header className="ai-finance-section-header">
        <div>
          <span aria-hidden="true">
            <FileText size={18} />
          </span>
          <div>
            <h3>Báo cáo tự động</h3>
            <p>
            Tạo nhanh báo cáo dạng văn bản để bạn ghi chép hoặc gửi lại.
            </p>
          </div>
        </div>

        <div className="ai-finance-report-switch" role="group" aria-label="Loại báo cáo">
          <button
            type="button"
            onClick={() => setReportMode("week")}
            className={reportMode === "week" ? "is-active" : ""}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => setReportMode("month")}
            className={reportMode === "month" ? "is-active" : ""}
          >
            Tháng
          </button>
        </div>
      </header>

      {selectedReportSections.length > 0 ? (
        <div className="ai-finance-report-document">
          {selectedReportSections.map((section) => {
            const Icon = AI_REPORT_SECTION_ICONS[section.id];

            return (
              <section
                className={`ai-finance-report-section is-${section.id}`}
                key={section.id}
              >
                <header>
                  <span aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <h4>{section.title}</h4>
                </header>
                <div>
                  {section.items.map((item) => (
                    <p key={item}>
                      <span aria-hidden="true" />
                      {item}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="ai-finance-report-copy">{selectedReport}</div>
      )}

      <div className="ai-finance-report-insights">
        <InsightList
          icon={CalendarClock}
          title="Kế hoạch ngày mai"
          items={automation.tomorrowPlan}
          tone="action"
        />
        <InsightList
          icon={ShieldAlert}
          title="Bất thường"
          items={automation.anomalies}
          tone="warning"
        />
      </div>
    </section>
  );
}

function AiQuestionAnswerView({
  answer,
  evidence,
  question,
  setQuestion,
  suggestedQuestions,
}: {
  answer: string;
  evidence: string[];
  question: string;
  setQuestion: (value: string) => void;
  suggestedQuestions: string[];
}) {
  return (
    <section className="ai-finance-qa-view">
      <header className="ai-finance-section-header">
        <div>
          <span aria-hidden="true">
            <MessageCircleQuestion size={18} />
          </span>
          <div>
            <h3>Hỏi đáp dữ liệu</h3>
            <p>Hỏi nhanh về Hub, chi tiêu, tiền/giờ hoặc tiến độ mục tiêu.</p>
          </div>
        </div>
      </header>

      <div className="ai-finance-suggested-questions">
        {suggestedQuestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setQuestion(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="ai-finance-question-field">
        <span>Câu hỏi của bạn</span>
        <textarea
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="VD: Tuần này Hub nào kiếm tốt nhất?"
        />
      </label>

      {answer && (
        <>
          <div className="ai-finance-local-answer">
            <span aria-hidden="true">
              <Bot size={18} />
            </span>
            <p>{answer}</p>
          </div>
          {evidence.length > 0 && (
            <div className="ai-finance-answer-evidence">
              <strong>Nguồn kiểm chứng trong app</strong>
              <div>
                {evidence.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function InsightList({
  icon: Icon,
  items,
  title,
  tone = "neutral",
}: {
  icon?: LucideIcon;
  items: string[];
  title: string;
  tone?: "action" | "neutral" | "positive" | "warning";
}) {
  return (
    <article className={`ai-finance-insight-list is-${tone}`}>
      <header>
        {Icon && (
          <span aria-hidden="true">
            <Icon size={17} />
          </span>
        )}
        <h3>{title}</h3>
        <small>{items.length}</small>
      </header>
      <div>
        {items.length > 0 ? (
          items.map((item) => (
            <p key={item}>
              <span aria-hidden="true" />
              {item}
            </p>
          ))
        ) : (
          <p className="is-empty">Chưa có nội dung trong kỳ này.</p>
        )}
      </div>
    </article>
  );
}
