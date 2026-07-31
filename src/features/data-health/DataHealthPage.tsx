import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { BalanceCheckEntry, CompletedGoal, DailyEntry, ExpenseEntry, Goals } from "../../types";
import type { HubEntry, HubSettings } from "../../types/hub";
import type { AccountTransaction, FinancialAccount } from "../account-ledger/accountLedgerModel";
import type { AccountReconciliation } from "../account-reconciliation/accountReconciliationModel";
import {
  DATA_HEALTH_CATEGORY_META,
  buildDataHealthReport,
  type DataHealthCategory,
  type DataHealthIssue,
  type DataHealthIssueAction,
  type DataHealthSeverity,
} from "./dataHealthModel";
import "./DataHealthPage.css";

const CATEGORY_ORDER: DataHealthCategory[] = [
  "duplicates",
  "hub",
  "journal",
  "accounts",
  "goals",
];

type IssueFilter = "all" | DataHealthSeverity;

type DataHealthPageProps = {
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
  onIssueAction: (action: DataHealthIssueAction) => void;
  reconciliations: AccountReconciliation[];
};

function formatScanTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DataHealthPage({
  accounts,
  accountTransactions,
  balanceChecks,
  completedGoals,
  entries,
  expenses,
  goals,
  hubEntries,
  hubSettings,
  onIssueAction,
  reconciliations,
}: DataHealthPageProps) {
  const [scanTime, setScanTime] = useState(() => new Date().toISOString());
  const [activeCategory, setActiveCategory] = useState<
    "all" | DataHealthCategory
  >("all");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const report = useMemo(
    () =>
      buildDataHealthReport(
        {
          accounts,
          accountTransactions,
          balanceChecks,
          completedGoals,
          entries,
          expenses,
          goals,
          hubEntries,
          hubSettings,
          reconciliations,
        },
        scanTime
      ),
    [
      accounts,
      accountTransactions,
      balanceChecks,
      completedGoals,
      entries,
      expenses,
      goals,
      hubEntries,
      hubSettings,
      reconciliations,
      scanTime,
    ]
  );
  const errorCount = report.issues.filter(
    (issue) => issue.severity === "error"
  ).length;
  const warningCount = report.issues.length - errorCount;
  const visibleIssues = report.issues.filter((issue) => {
    const matchesCategory =
      activeCategory === "all" || issue.category === activeCategory;
    const matchesSeverity =
      issueFilter === "all" || issue.severity === issueFilter;

    return matchesCategory && matchesSeverity;
  });
  const isHealthy = report.issues.length === 0;

  return (
    <div className="data-health-page">
      <header className="data-health-header">
        <div className="data-health-header__icon" aria-hidden="true">
          <ShieldCheck size={24} />
        </div>
        <div className="data-health-header__copy">
          <span>Kiểm soát tính nhất quán</span>
          <h1>Kiểm tra sức khỏe dữ liệu</h1>
          <p>
            Đối chiếu dữ liệu gốc trước khi chúng ảnh hưởng tới báo cáo, mục
            tiêu và số dư.
          </p>
        </div>
        <button
          className="data-health-scan-button"
          onClick={() => setScanTime(new Date().toISOString())}
          type="button"
        >
          <RefreshCcw aria-hidden="true" size={17} />
          Quét lại
        </button>
      </header>

      <section
        className={`data-health-overview ${isHealthy ? "is-healthy" : "has-issues"}`}
        aria-label="Tóm tắt sức khỏe dữ liệu"
      >
        <div className="data-health-overview__status">
          <span className="data-health-overview__status-icon" aria-hidden="true">
            {isHealthy ? <CheckCircle2 size={23} /> : <CircleAlert size={23} />}
          </span>
          <div>
            <strong>
              {isHealthy
                ? "Dữ liệu đang nhất quán"
                : `${report.issues.length} vấn đề cần kiểm tra`}
            </strong>
            <span>Quét lúc {formatScanTime(report.generatedAt)}</span>
          </div>
        </div>
        <div className="data-health-overview__metric is-error">
          <span>Lỗi cần sửa</span>
          <strong>{errorCount}</strong>
        </div>
        <div className="data-health-overview__metric is-warning">
          <span>Cần xem lại</span>
          <strong>{warningCount}</strong>
        </div>
        <div className="data-health-overview__metric">
          <span>Nhóm đã kiểm tra</span>
          <strong>{CATEGORY_ORDER.length}/5</strong>
        </div>
      </section>

      <section className="data-health-category-section" aria-labelledby="data-health-category-title">
        <div className="data-health-section-heading">
          <div>
            <h2 id="data-health-category-title">Phạm vi kiểm tra</h2>
            <p>Chọn một nhóm để chỉ xem các vấn đề liên quan.</p>
          </div>
        </div>

        <div className="data-health-category-grid">
          {CATEGORY_ORDER.map((category) => {
            const meta = DATA_HEALTH_CATEGORY_META[category];
            const categoryIssues = report.issues.filter(
              (issue) => issue.category === category
            );
            const categoryErrors = categoryIssues.filter(
              (issue) => issue.severity === "error"
            ).length;
            const active = activeCategory === category;

            return (
              <button
                aria-pressed={active}
                className={`data-health-category ${
                  active ? "is-active" : ""
                } ${categoryIssues.length === 0 ? "is-clear" : "has-issues"}`}
                key={category}
                onClick={() =>
                  setActiveCategory((current) =>
                    current === category ? "all" : category
                  )
                }
                type="button"
              >
                <span className="data-health-category__topline">
                  <strong>{meta.label}</strong>
                  <b>{categoryIssues.length}</b>
                </span>
                <span>{meta.description}</span>
                <small>
                  {report.checkedByCategory[category]} đối tượng ·{" "}
                  {categoryIssues.length === 0
                    ? "Không phát hiện lỗi"
                    : `${categoryErrors} lỗi cần sửa`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="data-health-results" aria-labelledby="data-health-results-title">
        <div className="data-health-section-heading data-health-results__heading">
          <div>
            <h2 id="data-health-results-title">Vấn đề được phát hiện</h2>
            <p>
              Mở nguyên nhân trước khi sửa. Ứng dụng không tự thay đổi dữ liệu
              tiền của bạn.
            </p>
          </div>
          <div className="data-health-filter" aria-label="Lọc theo mức độ">
            {(
              [
                ["all", "Tất cả"],
                ["error", "Lỗi"],
                ["warning", "Cần xem"],
              ] as Array<[IssueFilter, string]>
            ).map(([value, label]) => (
              <button
                aria-pressed={issueFilter === value}
                className={issueFilter === value ? "is-active" : ""}
                key={value}
                onClick={() => setIssueFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleIssues.length === 0 ? (
          <div className="data-health-empty">
            <CheckCircle2 aria-hidden="true" size={27} />
            <strong>Không có vấn đề trong phạm vi này</strong>
            <span>
              {report.issues.length === 0
                ? "Các dữ liệu được kiểm tra hiện đang nhất quán."
                : "Hãy đổi nhóm hoặc bộ lọc để xem các vấn đề khác."}
            </span>
          </div>
        ) : (
          <div className="data-health-issue-list">
            {visibleIssues.map((issue) => (
              <DataHealthIssueCard
                expanded={expandedIssueId === issue.id}
                issue={issue}
                key={issue.id}
                onAction={() => onIssueAction(issue.action)}
                onToggle={() =>
                  setExpandedIssueId((current) =>
                    current === issue.id ? null : issue.id
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DataHealthIssueCard({
  expanded,
  issue,
  onAction,
  onToggle,
}: {
  expanded: boolean;
  issue: DataHealthIssue;
  onAction: () => void;
  onToggle: () => void;
}) {
  const meta = DATA_HEALTH_CATEGORY_META[issue.category];
  const StatusIcon = issue.severity === "error" ? CircleAlert : AlertTriangle;

  return (
    <article className={`data-health-issue is-${issue.severity}`}>
      <div className="data-health-issue__icon" aria-hidden="true">
        <StatusIcon size={19} />
      </div>
      <div className="data-health-issue__body">
        <div className="data-health-issue__meta">
          <span>{meta.label}</span>
          <span>{issue.severity === "error" ? "Cần sửa" : "Cần xem lại"}</span>
        </div>
        <h3>{issue.title}</h3>
        <p>{issue.summary}</p>

        {expanded && (
          <div className="data-health-issue__details">
            <div>
              <strong>Nguyên nhân</strong>
              <p>{issue.cause}</p>
            </div>
            <dl>
              {issue.facts.map((fact) => (
                <div key={`${fact.label}-${fact.value}`}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <strong>Cách xử lý</strong>
              <p>{issue.resolution}</p>
            </div>
          </div>
        )}
      </div>
      <div className="data-health-issue__actions">
        <button className="data-health-detail-button" onClick={onToggle} type="button">
          {expanded ? "Thu gọn" : "Xem nguyên nhân"}
          {expanded ? (
            <ChevronUp aria-hidden="true" size={16} />
          ) : (
            <ChevronDown aria-hidden="true" size={16} />
          )}
        </button>
        <button className="data-health-fix-button" onClick={onAction} type="button">
          {issue.actionLabel}
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>
    </article>
  );
}
