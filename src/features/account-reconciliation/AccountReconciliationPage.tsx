import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Landmark,
  Plus,
  RefreshCcw,
  Scale,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getToday } from "../../utils/date";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "../../utils/money";
import {
  calculateAccountBalanceAtDate,
  type AccountTransaction,
  type FinancialAccount,
  type FinancialAccountType,
} from "../account-ledger/accountLedgerModel";
import {
  RECONCILIATION_REASON_LABELS,
  buildReconciliationLine,
  createReconciliationAdjustmentTransaction,
  getReconciliationStatus,
  getReconciliationTotals,
  type AccountReconciliation,
  type ReconciliationReason,
} from "./accountReconciliationModel";
import "./AccountReconciliationPage.css";

const HISTORY_PAGE_SIZE = 5;

const ACCOUNT_ICONS = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: WalletCards,
  other: Scale,
} satisfies Record<FinancialAccountType, typeof Banknote>;

type DraftLine = {
  actual: string;
  note: string;
  reason: ReconciliationReason;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatSignedMoney(value: number) {
  if (value === 0) return formatMoney(0);
  return `${value > 0 ? "+" : "−"}${formatMoney(Math.abs(value))}`;
}

function createDraftLines(
  accounts: FinancialAccount[],
  check?: AccountReconciliation
) {
  return Object.fromEntries(
    accounts.map((account) => {
      const savedLine = check?.lines.find(
        (line) => line.accountId === account.id
      );

      return [
        account.id,
        {
          actual: savedLine
            ? formatMoneyInput(String(savedLine.actualBalance))
            : "",
          note: savedLine?.note ?? "",
          reason: savedLine?.reason ?? "unknown",
        },
      ];
    })
  ) as Record<string, DraftLine>;
}

export function AccountReconciliationPage({
  accounts,
  checks,
  cloudStatus,
  deleteCheck,
  markLineAdjusted,
  onOpenLedger,
  saveAccount,
  saveCheck,
  saveTransaction,
  transactions,
}: {
  accounts: FinancialAccount[];
  checks: AccountReconciliation[];
  cloudStatus: string;
  deleteCheck: (checkId: string) => void;
  markLineAdjusted: (payload: {
    accountId: string;
    adjustedAt: string;
    checkId: string;
    transactionId: string;
  }) => void;
  onOpenLedger: () => void;
  saveAccount: (account: FinancialAccount) => void;
  saveCheck: (check: AccountReconciliation) => void;
  saveTransaction: (transaction: AccountTransaction) => void;
  transactions: AccountTransaction[];
}) {
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.archivedAt),
    [accounts]
  );
  const sortedChecks = useMemo(
    () =>
      [...checks].sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.updatedAt.localeCompare(left.updatedAt)
      ),
    [checks]
  );
  const [selectedDate, setSelectedDate] = useState(getToday());
  const initialCheck = sortedChecks.find((check) => check.date === getToday());
  const [draftLines, setDraftLines] = useState<Record<string, DraftLine>>(() =>
    createDraftLines(activeAccounts, initialCheck)
  );
  const [generalNote, setGeneralNote] = useState(initialCheck?.note ?? "");
  const [historyPage, setHistoryPage] = useState(1);
  const [editingCheckId, setEditingCheckId] = useState(
    initialCheck?.id ?? null
  );
  const checkById = useMemo(
    () => new Map(checks.map((check) => [check.id, check])),
    [checks]
  );
  const selectedCheck = editingCheckId
    ? checkById.get(editingCheckId)
    : undefined;
  const expectedBalances = useMemo(
    () =>
      Object.fromEntries(
        activeAccounts.map((account) => {
          const savedLine = selectedCheck?.lines.find(
            (line) => line.accountId === account.id
          );

          return [
            account.id,
            savedLine?.expectedBalance ??
              calculateAccountBalanceAtDate(
                account,
                transactions,
                selectedDate
              ),
          ];
        })
      ) as Record<string, number>,
    [activeAccounts, selectedCheck, selectedDate, transactions]
  );
  const draftSummary = useMemo(() => {
    const lines = activeAccounts.flatMap((account) => {
      const draft = draftLines[account.id];

      if (!draft?.actual.trim()) return [];

      const actual = parseMoneyInput(draft.actual);
      const expected = expectedBalances[account.id] ?? 0;

      return [
        {
          accountId: account.id,
          accountName: account.name,
          actualBalance: actual,
          difference: actual - expected,
          expectedBalance: expected,
          note: draft.note,
          reason: draft.reason,
        },
      ];
    });

    return getReconciliationTotals(lines);
  }, [activeAccounts, draftLines, expectedBalances]);
  const pendingLines = useMemo(
    () =>
      sortedChecks.flatMap((check) =>
        check.lines
          .filter(
            (line) =>
              line.difference !== 0 && !line.adjustmentTransactionId
          )
          .map((line) => ({ check, line }))
      ),
    [sortedChecks]
  );
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(sortedChecks.length / HISTORY_PAGE_SIZE)
  );
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedChecks = sortedChecks.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE
  );
  const latestCheck = sortedChecks[0];
  const latestTotals = latestCheck
    ? getReconciliationTotals(latestCheck.lines)
    : { actual: 0, difference: 0, expected: 0, unresolved: 0 };
  const hasDriverWallet = activeAccounts.some((account) =>
    account.name.toLocaleLowerCase("vi-VN").includes("driver")
  );

  function loadDate(date: string) {
    const existing = sortedChecks.find((check) => check.date === date);

    setSelectedDate(date);
    setEditingCheckId(existing?.id ?? null);
    setDraftLines(createDraftLines(activeAccounts, existing));
    setGeneralNote(existing?.note ?? "");
  }

  function updateDraft(accountId: string, patch: Partial<DraftLine>) {
    setDraftLines((current) => {
      const previous = current[accountId] ?? {
        actual: "",
        note: "",
        reason: "unknown" as const,
      };

      return {
        ...current,
        [accountId]: {
          ...previous,
          ...patch,
        },
      };
    });
  }

  function addDriverWallet() {
    const now = new Date().toISOString();

    saveAccount({
      createdAt: now,
      id: crypto.randomUUID(),
      name: "Ví Driver",
      openingBalance: 0,
      type: "e_wallet",
      updatedAt: now,
    });
    alert("Đã thêm Ví Driver vào Sổ tài khoản.");
  }

  function submitCheck(event: React.FormEvent) {
    event.preventDefault();
    const lines = activeAccounts.flatMap((account) => {
      const draft = draftLines[account.id];

      if (!draft?.actual.trim()) return [];

      const newLine = buildReconciliationLine({
        account,
        actualBalance: parseMoneyInput(draft.actual),
        expectedBalance: expectedBalances[account.id] ?? 0,
        note: draft.note,
        reason: draft.reason,
      });
      const previousLine = selectedCheck?.lines.find(
        (line) => line.accountId === account.id
      );

      return [
        previousLine?.adjustmentTransactionId
          ? {
              ...newLine,
              adjustedAt: previousLine.adjustedAt,
              adjustmentTransactionId:
                previousLine.adjustmentTransactionId,
            }
          : newLine,
      ];
    });

    if (lines.length === 0) {
      alert("Hãy nhập số dư thực tế của ít nhất một tài khoản.");
      return;
    }

    const now = new Date().toISOString();
    const check: AccountReconciliation = {
      createdAt: selectedCheck?.createdAt ?? now,
      date: selectedDate,
      id: selectedCheck?.id ?? crypto.randomUUID(),
      lines,
      note: generalNote.trim(),
      updatedAt: now,
    };

    saveCheck(check);
    setEditingCheckId(check.id);
    alert("Đã lưu kiểm kê tài khoản.");
  }

  function applyAdjustment(
    check: AccountReconciliation,
    accountId: string
  ) {
    const line = check.lines.find((item) => item.accountId === accountId);

    if (!line) return;
    if (line.reason === "internal_transfer") {
      alert(
        "Khoản chuyển nội bộ cần ghi đủ tài khoản gửi và nhận trong Sổ tài khoản."
      );
      onOpenLedger();
      return;
    }
    if (line.reason === "unknown") {
      alert(
        "Hãy chỉnh lần kiểm kê và chọn nguyên nhân trước khi tạo điều chỉnh."
      );
      return;
    }

    const now = new Date().toISOString();
    const transaction = createReconciliationAdjustmentTransaction(
      check,
      line,
      now
    );

    if (!transaction) return;

    const action = transaction.type === "income" ? "cộng" : "trừ";
    if (
      !confirm(
        `Tạo giao dịch ${action} ${formatMoney(
          transaction.amount
        )} cho ${line.accountName}? Thao tác này chỉ cập nhật Sổ tài khoản.`
      )
    ) {
      return;
    }

    saveTransaction(transaction);
    markLineAdjusted({
      accountId,
      adjustedAt: now,
      checkId: check.id,
      transactionId: transaction.id,
    });
    alert("Đã tạo giao dịch điều chỉnh trong Sổ tài khoản.");
  }

  function removeCheck(check: AccountReconciliation) {
    const hasAdjustment = check.lines.some(
      (line) => line.adjustmentTransactionId
    );
    const message = hasAdjustment
      ? "Xóa lần kiểm kê này? Các giao dịch điều chỉnh đã tạo trong Sổ tài khoản vẫn được giữ."
      : `Xóa lần kiểm kê ngày ${formatDate(check.date)}?`;

    if (!confirm(message)) return;
    deleteCheck(check.id);
    if (editingCheckId === check.id) {
      setEditingCheckId(null);
      setDraftLines(createDraftLines(activeAccounts));
      setGeneralNote("");
    }
    if (paginatedChecks.length === 1 && safeHistoryPage > 1) {
      setHistoryPage(safeHistoryPage - 1);
    }
  }

  return (
    <div className="reconciliation-page">
      <header className="reconciliation-header">
        <div>
          <span className="reconciliation-eyebrow">
            <Scale aria-hidden="true" size={18} />
            Kiểm soát tiền thực tế
          </span>
          <h1>Trung tâm kiểm kê tài khoản</h1>
          <p>
            Đối chiếu Ví Driver, ngân hàng, ví điện tử và tiền mặt với Sổ tài
            khoản.
          </p>
          <small>{cloudStatus}</small>
        </div>
        <div className="reconciliation-header-actions">
          <button
            className="notification-secondary-button"
            onClick={onOpenLedger}
            type="button"
          >
            <WalletCards aria-hidden="true" size={18} />
            Mở Sổ tài khoản
          </button>
          <button
            className="notification-primary-button"
            onClick={() => loadDate(getToday())}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            Kiểm kê hôm nay
          </button>
        </div>
      </header>

      <section
        className="reconciliation-summary"
        aria-label="Tóm tắt kiểm kê gần nhất"
      >
        <div>
          <span>Sổ dự kiến gần nhất</span>
          <strong>{formatMoney(latestTotals.expected)}</strong>
        </div>
        <div>
          <span>Thực tế gần nhất</span>
          <strong>{formatMoney(latestTotals.actual)}</strong>
        </div>
        <div
          className={`is-${getReconciliationStatus(
            latestTotals.difference
          )}`}
        >
          <span>Chênh lệch gần nhất</span>
          <strong>{formatSignedMoney(latestTotals.difference)}</strong>
        </div>
        <div>
          <span>Khoản chưa xử lý</span>
          <strong>{pendingLines.length}</strong>
        </div>
      </section>

      <div className="reconciliation-main-grid">
        <form className="reconciliation-form" onSubmit={submitCheck}>
          <div className="reconciliation-section-heading">
            <div>
              <h2>Nhập số dư thực tế</h2>
              <p>
                Bỏ trống tài khoản chưa muốn kiểm kê. Số dư sổ được chốt theo
                ngày đã chọn.
              </p>
            </div>
            <label className="reconciliation-date-field">
              <span>Ngày kiểm kê</span>
              <input
                max={getToday()}
                onChange={(event) => loadDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </label>
          </div>

          {!hasDriverWallet && (
            <div className="reconciliation-driver-prompt">
              <div>
                <strong>Bạn chưa có Ví Driver</strong>
                <span>
                  Thêm nguồn giữ tiền này để kiểm kê riêng số dư trong ứng dụng
                  tài xế.
                </span>
              </div>
              <button
                className="notification-secondary-button"
                onClick={addDriverWallet}
                type="button"
              >
                Thêm Ví Driver
              </button>
            </div>
          )}

          <div className="reconciliation-account-list">
            {activeAccounts.map((account) => {
              const Icon = ACCOUNT_ICONS[account.type];
              const draft = draftLines[account.id] ?? {
                actual: "",
                note: "",
                reason: "unknown" as const,
              };
              const expected = expectedBalances[account.id] ?? 0;
              const hasActual = Boolean(draft.actual.trim());
              const actual = hasActual ? parseMoneyInput(draft.actual) : 0;
              const difference = hasActual ? actual - expected : 0;
              const status = getReconciliationStatus(difference);
              const savedLine = selectedCheck?.lines.find(
                (line) => line.accountId === account.id
              );
              const isAdjusted = Boolean(
                savedLine?.adjustmentTransactionId
              );

              return (
                <article
                  className={`reconciliation-account-row is-${status}`}
                  key={account.id}
                >
                  <div className="reconciliation-account-title">
                    <span>
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <div>
                      <strong>{account.name}</strong>
                      <small>Sổ dự kiến {formatMoney(expected)}</small>
                    </div>
                  </div>

                  <label className="reconciliation-field">
                    <span>Số dư thực tế</span>
                    <div className="reconciliation-money-input">
                      <input
                        disabled={isAdjusted}
                        inputMode="numeric"
                        onChange={(event) =>
                          updateDraft(account.id, {
                            actual: formatMoneyInput(event.target.value),
                          })
                        }
                        placeholder="VD: 1.250.000"
                        value={draft.actual}
                      />
                      <span>đ</span>
                    </div>
                  </label>

                  <div className="reconciliation-difference">
                    <span>Chênh lệch</span>
                    <strong>
                      {hasActual ? formatSignedMoney(difference) : "Chưa nhập"}
                    </strong>
                    {isAdjusted && <small>Đã điều chỉnh trong sổ</small>}
                  </div>

                  {hasActual && difference !== 0 && (
                    <div className="reconciliation-line-details">
                      <label className="reconciliation-field">
                        <span>Nguyên nhân</span>
                        <select
                          disabled={isAdjusted}
                          onChange={(event) =>
                            updateDraft(account.id, {
                              reason: event.target.value as ReconciliationReason,
                            })
                          }
                          value={draft.reason}
                        >
                          {(
                            Object.keys(
                              RECONCILIATION_REASON_LABELS
                            ) as ReconciliationReason[]
                          ).map((reason) => (
                            <option key={reason} value={reason}>
                              {RECONCILIATION_REASON_LABELS[reason]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="reconciliation-field">
                        <span>Ghi chú khoản lệch</span>
                        <input
                          disabled={isAdjusted}
                          maxLength={200}
                          onChange={(event) =>
                            updateDraft(account.id, {
                              note: event.target.value,
                            })
                          }
                          placeholder="VD: Chưa ghi tiền xăng"
                          value={draft.note}
                        />
                      </label>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <label className="reconciliation-field reconciliation-note-field">
            <span>Ghi chú chung</span>
            <textarea
              maxLength={300}
              onChange={(event) => setGeneralNote(event.target.value)}
              placeholder="Tình trạng đối soát hoặc việc cần kiểm tra thêm"
              rows={2}
              value={generalNote}
            />
          </label>

          <div className="reconciliation-form-review">
            <div>
              <span>Sổ dự kiến</span>
              <strong>{formatMoney(draftSummary.expected)}</strong>
            </div>
            <div>
              <span>Thực tế đã nhập</span>
              <strong>{formatMoney(draftSummary.actual)}</strong>
            </div>
            <div
              className={`is-${getReconciliationStatus(
                draftSummary.difference
              )}`}
            >
              <span>Tổng chênh lệch</span>
              <strong>{formatSignedMoney(draftSummary.difference)}</strong>
            </div>
            <button className="notification-primary-button" type="submit">
              <ClipboardCheck aria-hidden="true" size={18} />
              {selectedCheck ? "Cập nhật kiểm kê" : "Lưu kiểm kê"}
            </button>
          </div>
        </form>

        <aside className="reconciliation-pending">
          <div className="reconciliation-section-heading">
            <div>
              <h2>Chênh lệch cần xử lý</h2>
              <p>Chỉ điều chỉnh Sổ tài khoản sau khi đã rõ nguyên nhân.</p>
            </div>
            <span className="reconciliation-count">{pendingLines.length}</span>
          </div>

          {pendingLines.length === 0 ? (
            <div className="reconciliation-empty">
              <CheckCircle2 aria-hidden="true" size={24} />
              <strong>Không có khoản lệch đang chờ</strong>
              <span>Các lần kiểm kê hiện đã khớp hoặc đã được xử lý.</span>
            </div>
          ) : (
            <div className="reconciliation-pending-list">
              {pendingLines.slice(0, 8).map(({ check, line }) => {
                const status = getReconciliationStatus(line.difference);
                const StatusIcon =
                  status === "surplus" ? ArrowUpRight : ArrowDownRight;
                const canAdjust =
                  line.reason !== "unknown" &&
                  line.reason !== "internal_transfer";

                return (
                  <article
                    className={`reconciliation-pending-item is-${status}`}
                    key={`${check.id}-${line.accountId}`}
                  >
                    <span className="reconciliation-pending-icon">
                      <StatusIcon aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <strong>{line.accountName}</strong>
                      <span>
                        {formatDate(check.date)} ·{" "}
                        {RECONCILIATION_REASON_LABELS[line.reason]}
                      </span>
                      <b>{formatSignedMoney(line.difference)}</b>
                    </div>
                    <button
                      className="reconciliation-adjust-button"
                      onClick={() => applyAdjustment(check, line.accountId)}
                      type="button"
                    >
                      {canAdjust ? "Điều chỉnh sổ" : "Xử lý"}
                      <ArrowRight aria-hidden="true" size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <section className="reconciliation-history">
        <div className="reconciliation-section-heading">
          <div>
            <h2>Lịch sử kiểm kê tài khoản</h2>
            <p>
              {sortedChecks.length} lần kiểm kê, tối đa {HISTORY_PAGE_SIZE} bản
              ghi mỗi trang.
            </p>
          </div>
        </div>

        {paginatedChecks.length === 0 ? (
          <div className="reconciliation-empty">
            <ClipboardCheck aria-hidden="true" size={24} />
            <strong>Chưa có lần kiểm kê tài khoản</strong>
            <span>Nhập số dư thực tế ở biểu mẫu phía trên để bắt đầu.</span>
          </div>
        ) : (
          <div className="reconciliation-history-list">
            {paginatedChecks.map((check) => {
              const totals = getReconciliationTotals(check.lines);
              const status = getReconciliationStatus(totals.difference);

              return (
                <article
                  className={`reconciliation-history-item is-${status}`}
                  key={check.id}
                >
                  <div className="reconciliation-history-date">
                    <strong>{formatDate(check.date)}</strong>
                    <span>{check.lines.length} tài khoản</span>
                  </div>
                  <div>
                    <span>Sổ dự kiến</span>
                    <strong>{formatMoney(totals.expected)}</strong>
                  </div>
                  <div>
                    <span>Thực tế</span>
                    <strong>{formatMoney(totals.actual)}</strong>
                  </div>
                  <div>
                    <span>Chênh lệch</span>
                    <strong>{formatSignedMoney(totals.difference)}</strong>
                  </div>
                  <div>
                    <span>Chưa xử lý</span>
                    <strong>{totals.unresolved}</strong>
                  </div>
                  <div className="reconciliation-history-actions">
                    <button
                      aria-label={`Sửa kiểm kê ngày ${formatDate(check.date)}`}
                      className="ledger-icon-button"
                      onClick={() => {
                        setSelectedDate(check.date);
                        setEditingCheckId(check.id);
                        setDraftLines(createDraftLines(activeAccounts, check));
                        setGeneralNote(check.note);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      type="button"
                    >
                      <RefreshCcw aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label={`Xóa kiểm kê ngày ${formatDate(check.date)}`}
                      className="ledger-icon-button is-danger"
                      onClick={() => removeCheck(check)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalHistoryPages > 1 && (
          <div className="reconciliation-pagination">
            <button
              aria-label="Trang kiểm kê trước"
              className="ledger-icon-button"
              disabled={safeHistoryPage === 1}
              onClick={() =>
                setHistoryPage((current) => Math.max(1, current - 1))
              }
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span>
              Trang {safeHistoryPage}/{totalHistoryPages}
            </span>
            <button
              aria-label="Trang kiểm kê sau"
              className="ledger-icon-button"
              disabled={safeHistoryPage === totalHistoryPages}
              onClick={() =>
                setHistoryPage((current) =>
                  Math.min(totalHistoryPages, current + 1)
                )
              }
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
        )}
      </section>

      <div className="reconciliation-scope-note">
        <CircleAlert aria-hidden="true" size={18} />
        <span>
          Trung tâm này chỉ đối chiếu và điều chỉnh Sổ tài khoản. Nhật ký, thu
          nhập App tính và mục tiêu không bị thay đổi.
        </span>
      </div>
    </div>
  );
}
