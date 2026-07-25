import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Pause,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SubGoal } from "../../types";
import type { HubType } from "../../types/hub";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../utils/money";
import type { FinancialAccount } from "../account-ledger/accountLedgerModel";
import {
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_AMOUNT_MODE_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  type AutomationAction,
  type AutomationAmountMode,
  type AutomationRule,
  type AutomationRunLog,
  type AutomationTrigger,
} from "./automationModel";

const LOGS_PER_PAGE = 6;
const HUB_OPTIONS: HubType[] = [
  "HUB_1",
  "HUB_3",
  "HUB_5",
  "HUB_8",
  "HUB_10",
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRuleSummary(rule: AutomationRule) {
  const parts = [AUTOMATION_TRIGGER_LABELS[rule.trigger]];

  if (rule.minimumAmount > 0) {
    parts.push(`từ ${formatMoney(rule.minimumAmount)}`);
  }

  if (rule.expenseLabel) parts.push(`nhãn ${rule.expenseLabel}`);
  if (rule.hubType) parts.push(rule.hubType.replace("_", " "));

  return parts.join(" · ");
}

function RuleForm({
  accounts,
  expenseLabels,
  onClose,
  onSave,
  rule,
  subGoals,
}: {
  accounts: FinancialAccount[];
  expenseLabels: string[];
  onClose: () => void;
  onSave: (rule: AutomationRule) => void;
  rule: AutomationRule | null;
  subGoals: SubGoal[];
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    rule?.trigger ?? "journal_income"
  );
  const [action, setAction] = useState<AutomationAction>(
    rule?.action ?? "ledger"
  );
  const [minimumAmount, setMinimumAmount] = useState(
    rule?.minimumAmount
      ? formatMoneyInput(String(rule.minimumAmount))
      : ""
  );
  const [expenseLabel, setExpenseLabel] = useState(rule?.expenseLabel ?? "");
  const [hubType, setHubType] = useState<HubType | "">(rule?.hubType ?? "");
  const [targetId, setTargetId] = useState(
    rule?.targetId ?? accounts[0]?.id ?? subGoals[0]?.id ?? ""
  );
  const [amountMode, setAmountMode] = useState<AutomationAmountMode>(
    rule?.amountMode ?? "full"
  );
  const [amountValue, setAmountValue] = useState(
    rule?.amountValue ? formatMoneyInput(String(rule.amountValue)) : ""
  );
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function changeAction(nextAction: AutomationAction) {
    setAction(nextAction);

    if (nextAction === "ledger") {
      setTargetId(accounts[0]?.id ?? "");
    } else if (nextAction === "subgoal") {
      setTargetId(subGoals[0]?.id ?? "");
    } else {
      setTargetId("");
      setAmountMode("full");
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedValue =
      amountMode === "percent"
        ? Number(amountValue.replace(/[^\d]/g, ""))
        : parseMoneyInput(amountValue);

    if (!trimmedName) {
      alert("Bạn chưa nhập tên quy tắc.");
      return;
    }

    if (action !== "alert" && !targetId) {
      alert("Hãy chọn nơi nhận kết quả tự động.");
      return;
    }

    if (
      action !== "alert" &&
      amountMode !== "full" &&
      (parsedValue <= 0 || (amountMode === "percent" && parsedValue > 100))
    ) {
      alert(
        amountMode === "percent"
          ? "Phần trăm phải từ 1 đến 100."
          : "Số tiền tự động phải lớn hơn 0."
      );
      return;
    }

    const now = new Date().toISOString();

    onSave({
      action,
      activeFrom: now,
      amountMode: action === "alert" ? "full" : amountMode,
      amountValue:
        action === "alert" || amountMode === "full" ? 0 : parsedValue,
      createdAt: rule?.createdAt ?? now,
      enabled,
      expenseLabel: trigger === "expense" ? expenseLabel : "",
      hubType: trigger === "hub_shift" ? hubType : "",
      id: rule?.id ?? crypto.randomUUID(),
      minimumAmount: parseMoneyInput(minimumAmount),
      name: trimmedName,
      targetId: action === "alert" ? "" : targetId,
      trigger,
      updatedAt: now,
    });
    onClose();
  }

  return (
    <div
      className="automation-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="automation-rule-modal" onSubmit={submit}>
        <header className="automation-modal-header">
          <div>
            <span>
              <Workflow aria-hidden="true" size={16} />
              Trình tạo quy tắc
            </span>
            <h2>{rule ? "Chỉnh sửa quy tắc" : "Thêm quy tắc"}</h2>
          </div>
          <button
            aria-label="Đóng form quy tắc"
            className="automation-icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <label className="automation-field automation-field-wide">
          <span>Tên quy tắc</span>
          <input
            autoFocus
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="VD: Chi xăng tự trừ tiền mặt"
            value={name}
          />
        </label>

        <div className="automation-form-grid">
          <label className="automation-field">
            <span>Khi nào chạy</span>
            <select
              onChange={(event) =>
                setTrigger(event.target.value as AutomationTrigger)
              }
              value={trigger}
            >
              {(Object.keys(AUTOMATION_TRIGGER_LABELS) as AutomationTrigger[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {AUTOMATION_TRIGGER_LABELS[value]}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="automation-field">
            <span>Số tiền tối thiểu</span>
            <div className="automation-money-input">
              <input
                inputMode="numeric"
                onChange={(event) =>
                  setMinimumAmount(formatMoneyInput(event.target.value))
                }
                placeholder="Không giới hạn"
                value={minimumAmount}
              />
              <span>đ</span>
            </div>
          </label>

          {trigger === "expense" && (
            <label className="automation-field">
              <span>Nhãn chi tiêu</span>
              <input
                list="automation-expense-labels"
                onChange={(event) => setExpenseLabel(event.target.value)}
                placeholder="Để trống để áp dụng mọi nhãn"
                value={expenseLabel}
              />
              <datalist id="automation-expense-labels">
                {expenseLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </datalist>
            </label>
          )}

          {trigger === "hub_shift" && (
            <label className="automation-field">
              <span>Loại Hub</span>
              <select
                onChange={(event) =>
                  setHubType(event.target.value as HubType | "")
                }
                value={hubType}
              >
                <option value="">Tất cả Hub</option>
                {HUB_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="automation-field">
            <span>Thực hiện</span>
            <select
              onChange={(event) =>
                changeAction(event.target.value as AutomationAction)
              }
              value={action}
            >
              {(Object.keys(AUTOMATION_ACTION_LABELS) as AutomationAction[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {AUTOMATION_ACTION_LABELS[value]}
                  </option>
                )
              )}
            </select>
          </label>

          {action === "ledger" && (
            <label className="automation-field">
              <span>Tài khoản nhận giao dịch</span>
              <select
                onChange={(event) => setTargetId(event.target.value)}
                value={targetId}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {accounts.length === 0 && (
                <small>Chưa có tài khoản đang hoạt động.</small>
              )}
            </label>
          )}

          {action === "subgoal" && (
            <label className="automation-field">
              <span>Mục tiêu phụ nhận tiền</span>
              <select
                onChange={(event) => setTargetId(event.target.value)}
                value={targetId}
              >
                {subGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
              {subGoals.length === 0 && (
                <small>Chưa có mục tiêu phụ đang hoạt động.</small>
              )}
            </label>
          )}

          {action !== "alert" && (
            <>
              <label className="automation-field">
                <span>Cách lấy số tiền</span>
                <select
                  onChange={(event) =>
                    setAmountMode(event.target.value as AutomationAmountMode)
                  }
                  value={amountMode}
                >
                  {(
                    Object.keys(
                      AUTOMATION_AMOUNT_MODE_LABELS
                    ) as AutomationAmountMode[]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {AUTOMATION_AMOUNT_MODE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              {amountMode !== "full" && (
                <label className="automation-field">
                  <span>
                    {amountMode === "percent" ? "Phần trăm" : "Số tiền"}
                  </span>
                  <div className="automation-money-input">
                    <input
                      inputMode="numeric"
                      onChange={(event) =>
                        setAmountValue(formatMoneyInput(event.target.value))
                      }
                      placeholder={amountMode === "percent" ? "VD: 20" : "VD: 100.000"}
                      value={amountValue}
                    />
                    <span>{amountMode === "percent" ? "%" : "đ"}</span>
                  </div>
                </label>
              )}
            </>
          )}
        </div>

        <label className="automation-enabled-row">
          <span>
            <strong>Kích hoạt ngay</strong>
            <small>Chỉ xử lý dữ liệu mới sau khi quy tắc được bật.</small>
          </span>
          <input
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
        </label>

        <footer className="automation-modal-actions">
          <button
            className="notification-secondary-button"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button className="notification-primary-button" type="submit">
            Lưu quy tắc
          </button>
        </footer>
      </form>
    </div>
  );
}

export function AutomationRulesPage({
  accounts,
  cloudStatus,
  deleteRule,
  expenseLabels,
  logs,
  rules,
  saveRule,
  subGoals,
  toggleRule,
}: {
  accounts: FinancialAccount[];
  cloudStatus: string;
  deleteRule: (ruleId: string) => void;
  expenseLabels: string[];
  logs: AutomationRunLog[];
  rules: AutomationRule[];
  saveRule: (rule: AutomationRule) => void;
  subGoals: SubGoal[];
  toggleRule: (ruleId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [logPage, setLogPage] = useState(1);
  const targetNames = useMemo(
    () =>
      new Map([
        ...accounts.map((account) => [account.id, account.name] as const),
        ...subGoals.map((goal) => [goal.id, goal.name] as const),
      ]),
    [accounts, subGoals]
  );
  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
  const paginatedLogs = logs.slice(
    (logPage - 1) * LOGS_PER_PAGE,
    logPage * LOGS_PER_PAGE
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthLogs = logs.filter((log) => log.createdAt.startsWith(currentMonth));
  const automatedAmount = monthLogs.reduce((sum, log) => sum + log.amount, 0);

  function openCreate() {
    setEditingRule(null);
    setShowForm(true);
  }

  function confirmDelete(rule: AutomationRule) {
    if (
      confirm(
        `Xóa quy tắc "${rule.name}"? Lịch sử đã chạy vẫn được giữ để đối chiếu.`
      )
    ) {
      deleteRule(rule.id);
    }
  }

  return (
    <div className="automation-page">
      <header className="automation-page-header">
        <div>
          <span className="automation-page-eyebrow">
            <Workflow aria-hidden="true" size={18} />
            Tự động hóa
          </span>
          <h1>Quy tắc tài chính</h1>
          <p>Tự xử lý các thao tác lặp lại khi dữ liệu mới được ghi nhận.</p>
          <small>{cloudStatus}</small>
        </div>
        <button
          className="notification-primary-button"
          onClick={openCreate}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Thêm quy tắc
        </button>
      </header>

      <section className="automation-summary" aria-label="Tóm tắt tự động hóa">
        <div>
          <span>Đang hoạt động</span>
          <strong>{rules.filter((rule) => rule.enabled).length}</strong>
        </div>
        <div>
          <span>Tổng quy tắc</span>
          <strong>{rules.length}</strong>
        </div>
        <div>
          <span>Lượt chạy tháng này</span>
          <strong>{monthLogs.length}</strong>
        </div>
        <div>
          <span>Giá trị đã xử lý</span>
          <strong>{formatMoney(automatedAmount)}</strong>
        </div>
      </section>

      <section className="automation-rule-section">
        <header className="automation-section-heading">
          <div>
            <h2>Quy tắc của bạn</h2>
            <p>Quy tắc chỉ chạy một lần cho mỗi bản ghi nguồn.</p>
          </div>
          <Bot aria-hidden="true" size={21} />
        </header>

        {rules.length === 0 ? (
          <div className="automation-empty">
            <Workflow aria-hidden="true" size={28} />
            <strong>Chưa có quy tắc tự động</strong>
            <span>
              Tạo quy tắc đầu tiên để giảm các thao tác ghi chép lặp lại.
            </span>
            <button
              className="notification-secondary-button"
              onClick={openCreate}
              type="button"
            >
              <Plus aria-hidden="true" size={17} />
              Tạo quy tắc
            </button>
          </div>
        ) : (
          <div className="automation-rule-list">
            {rules.map((rule) => {
              const ActionIcon =
                rule.action === "ledger"
                  ? CircleDollarSign
                  : rule.action === "subgoal"
                    ? Target
                    : BellRing;

              return (
                <article
                  className={`automation-rule-card ${
                    rule.enabled ? "is-enabled" : "is-paused"
                  }`}
                  key={rule.id}
                >
                  <span className="automation-rule-icon">
                    <ActionIcon aria-hidden="true" size={20} />
                  </span>
                  <div className="automation-rule-copy">
                    <div>
                      <strong>{rule.name}</strong>
                      <span>
                        {rule.enabled ? (
                          <CheckCircle2 aria-hidden="true" size={14} />
                        ) : (
                          <Pause aria-hidden="true" size={14} />
                        )}
                        {rule.enabled ? "Đang chạy" : "Đã tạm dừng"}
                      </span>
                    </div>
                    <p>{getRuleSummary(rule)}</p>
                    <small>
                      {AUTOMATION_ACTION_LABELS[rule.action]}
                      {rule.targetId
                        ? ` → ${targetNames.get(rule.targetId) ?? "Đích đã xóa"}`
                        : ""}
                      {rule.action !== "alert"
                        ? ` · ${AUTOMATION_AMOUNT_MODE_LABELS[rule.amountMode]}`
                        : ""}
                    </small>
                  </div>
                  <div className="automation-rule-actions">
                    <button
                      className="automation-toggle-button"
                      onClick={() => toggleRule(rule.id)}
                      type="button"
                    >
                      {rule.enabled ? (
                        <Pause aria-hidden="true" size={16} />
                      ) : (
                        <Play aria-hidden="true" size={16} />
                      )}
                      {rule.enabled ? "Tạm dừng" : "Bật"}
                    </button>
                    <button
                      aria-label={`Sửa ${rule.name}`}
                      className="automation-icon-button"
                      onClick={() => {
                        setEditingRule(rule);
                        setShowForm(true);
                      }}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={17} />
                    </button>
                    <button
                      aria-label={`Xóa ${rule.name}`}
                      className="automation-icon-button is-danger"
                      onClick={() => confirmDelete(rule)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="automation-history-section">
        <header className="automation-section-heading">
          <div>
            <h2>Lịch sử tự động chạy</h2>
            <p>{logs.length} kết quả đã được ghi nhận.</p>
          </div>
        </header>

        {paginatedLogs.length === 0 ? (
          <div className="automation-history-empty">
            <AlertTriangle aria-hidden="true" size={22} />
            Chưa có quy tắc nào được kích hoạt bởi dữ liệu mới.
          </div>
        ) : (
          <div className="automation-history-list">
            {paginatedLogs.map((log) => (
              <article className="automation-history-item" key={log.id}>
                <span>
                  <CheckCircle2 aria-hidden="true" size={18} />
                </span>
                <div>
                  <strong>{log.ruleName}</strong>
                  <p>{log.message}</p>
                  <small>{formatDateTime(log.createdAt)}</small>
                </div>
                <b>{formatMoney(log.amount)}</b>
                <ArrowRight aria-hidden="true" size={17} />
              </article>
            ))}
          </div>
        )}

        {totalLogPages > 1 && (
          <div className="automation-pagination">
            <button
              aria-label="Trang lịch sử trước"
              className="automation-icon-button"
              disabled={logPage === 1}
              onClick={() =>
                setLogPage((current) => Math.max(1, current - 1))
              }
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span>
              Trang {logPage}/{totalLogPages}
            </span>
            <button
              aria-label="Trang lịch sử sau"
              className="automation-icon-button"
              disabled={logPage === totalLogPages}
              onClick={() =>
                setLogPage((current) =>
                  Math.min(totalLogPages, current + 1)
                )
              }
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
        )}
      </section>

      {showForm && (
        <RuleForm
          accounts={accounts}
          expenseLabels={expenseLabels}
          onClose={() => setShowForm(false)}
          onSave={saveRule}
          rule={editingRule}
          subGoals={subGoals}
        />
      )}
    </div>
  );
}
