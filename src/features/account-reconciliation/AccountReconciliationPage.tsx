import { showAppToast, showSuccessToast } from "../../components/feedback/appToast.ts";
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
import { useMemo, useRef, useState } from "react";
import { getToday } from "../../utils/date";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "../../utils/money";
import {
  type AccountTransaction,
  type FinancialAccount,
  type FinancialAccountType,
} from "../account-ledger/accountLedgerModel";
import type { SavingsAllocation } from "../savings/domain/savingsModel.ts";
import { getSavingsHeldByAccount } from "../savings/domain/savingsBalance.ts";
import {
  ACCOUNT_RECONCILIATION_FOCUS_DATE_SESSION_KEY,
  RECONCILIATION_REASON_LABELS,
  buildReconciliationLine,
  createReconciliationAdjustmentTransaction,
  createReconciliationTransferTransaction,
  getAccountReconciliationBasis,
  getReconciliationSavingsAmountForLine,
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

type TransferDraft = {
  accountId: string;
  checkId: string;
  fromAccountId: string;
  toAccountId: string;
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
  savingsAllocations,
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
  savingsAllocations: SavingsAllocation[];
  transactions: AccountTransaction[];
}) {
  const [initialFocusDate] = useState(() => {
    const requestedDate = sessionStorage.getItem(
      ACCOUNT_RECONCILIATION_FOCUS_DATE_SESSION_KEY
    );
    sessionStorage.removeItem(ACCOUNT_RECONCILIATION_FOCUS_DATE_SESSION_KEY);

    return requestedDate || getToday();
  });
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
  const [selectedDate, setSelectedDate] = useState(initialFocusDate);
  const initialCheck = sortedChecks.find(
    (check) => check.date === initialFocusDate
  );
  const [draftLines, setDraftLines] = useState<Record<string, DraftLine>>(() =>
    createDraftLines(activeAccounts, initialCheck)
  );
  const [generalNote, setGeneralNote] = useState(initialCheck?.note ?? "");
  const [historyPage, setHistoryPage] = useState(1);
  const [editingCheckId, setEditingCheckId] = useState(
    initialCheck?.id ?? null
  );
  const [transferDraft, setTransferDraft] = useState<TransferDraft | null>(null);
  const transferSubmittingRef = useRef(false);
  const checkById = useMemo(
    () => new Map(checks.map((check) => [check.id, check])),
    [checks]
  );
  const selectedCheck = editingCheckId
    ? checkById.get(editingCheckId)
    : undefined;
  const savingsHeldAtDate = useMemo(() => getSavingsHeldByAccount(
    { transactions, savingsAllocations }, selectedDate
  ), [transactions, savingsAllocations, selectedDate]);
  const reconciliationBases = useMemo(
    () =>
      Object.fromEntries(
        activeAccounts.map((account) => [
          account.id,
          getAccountReconciliationBasis(account, transactions, selectedDate,
            savingsHeldAtDate.get(account.id) ?? 0),
        ])
      ) as Record<string, ReturnType<typeof getAccountReconciliationBasis>>,
    [activeAccounts, selectedDate, transactions, savingsHeldAtDate]
  );
  const reconciliationSavings = useMemo(() => Object.fromEntries(activeAccounts.map((account) => {
    const savedLine = selectedCheck?.lines.find((line) => line.accountId === account.id);
    return [account.id, getReconciliationSavingsAmountForLine(savedLine,
      reconciliationBases[account.id].savingsAmount, selectedDate, getToday())];
  })) as Record<string, number>, [activeAccounts, selectedCheck, reconciliationBases, selectedDate]);
  const expectedBalances = useMemo(
    () =>
      Object.fromEntries(
        activeAccounts.map((account) => {
          const savedLine = selectedCheck?.lines.find((line) => line.accountId === account.id);
          return [account.id, savedLine
            ? savedLine.expectedBalance - (reconciliationSavings[account.id] - (savedLine.savingsAmount ?? 0))
            : reconciliationBases[account.id].expectedBalance];
        })
      ) as Record<string, number>,
    [activeAccounts, reconciliationBases, reconciliationSavings, selectedCheck]
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
    setTransferDraft(null);
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
    showSuccessToast("Đã thêm Ví Driver vào Sổ tài khoản.");
  }

  function submitCheck(event: React.FormEvent) {
    event.preventDefault();
    const lines = activeAccounts.flatMap((account) => {
      const draft = draftLines[account.id];

      if (!draft?.actual.trim()) return [];

      const previousLine = selectedCheck?.lines.find(
        (line) => line.accountId === account.id
      );

      const newLine = buildReconciliationLine({
        account,
        actualBalance: parseMoneyInput(draft.actual),
        expectedBalance: expectedBalances[account.id] ?? 0,
        bookBalance: previousLine ? previousLine.bookBalance : reconciliationBases[account.id].bookBalance,
        externalAmount: previousLine ? previousLine.externalAmount : reconciliationBases[account.id].externalAmount,
        savingsAmount: reconciliationSavings[account.id],
        note: draft.note,
        reason: draft.reason,
      });

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
      showAppToast("Hãy nhập số dư thực tế của ít nhất một tài khoản.");
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
    showSuccessToast("Đã lưu kiểm kê tài khoản.");
  }

  function applyAdjustment(
    check: AccountReconciliation,
    accountId: string
  ) {
    const line = check.lines.find((item) => item.accountId === accountId);

    if (!line) return;
    if (line.reason === "internal_transfer") {
      if (activeAccounts.length < 2) {
        showAppToast("Cần ít nhất hai tài khoản đang hoạt động để ghi chuyển tiền nội bộ.");
        return;
      }
      setTransferDraft((current) => current?.checkId === check.id &&
        current.accountId === accountId ? null : {
          accountId,
          checkId: check.id,
          fromAccountId: line.difference < 0 ? accountId : "",
          toAccountId: line.difference > 0 ? accountId : "",
        });
      return;
    }
    if (line.reason === "unknown") {
      showAppToast(
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
    showSuccessToast("Đã tạo giao dịch điều chỉnh trong Sổ tài khoản.");
  }

  function submitTransfer(event: React.FormEvent, check: AccountReconciliation,
    accountId: string) {
    event.preventDefault();
    if (transferSubmittingRef.current || !transferDraft ||
      transferDraft.checkId !== check.id || transferDraft.accountId !== accountId) return;
    const line = check.lines.find((item) => item.accountId === accountId);
    if (!line || line.adjustmentTransactionId) {
      setTransferDraft(null);
      return;
    }
    const from = activeAccounts.find((account) => account.id === transferDraft.fromAccountId);
    const to = activeAccounts.find((account) => account.id === transferDraft.toAccountId);
    if (!from || !to || from.id === to.id) {
      showAppToast("Hãy chọn hai tài khoản khác nhau còn hoạt động.");
      return;
    }
    const transaction = createReconciliationTransferTransaction(
      check, line, from.id, to.id
    );
    if (!transaction) {
      showAppToast(line.difference < 0
        ? `Tài khoản gửi phải là ${line.accountName} vì số thực tế thấp hơn sổ.`
        : `Tài khoản nhận phải là ${line.accountName} vì số thực tế cao hơn sổ.`);
      return;
    }
    const existing = transactions.find((item) => item.id === transaction.id);
    if (existing && (existing.type !== "transfer" ||
      existing.accountId !== from.id || existing.toAccountId !== to.id ||
      existing.amount !== transaction.amount || existing.date !== transaction.date)) {
      showAppToast("Giao dịch kiểm kê này đã được ghi với thông tin khác. Hãy kiểm tra lại trước khi xử lý.");
      return;
    }
    const similar = transactions.some((item) => item.id !== transaction.id &&
      item.type === "transfer" && item.accountId === from.id &&
      item.toAccountId === to.id && item.amount === transaction.amount &&
      item.date === transaction.date);
    if (similar && !confirm("Đã có giao dịch chuyển tiền giống hệt trong ngày này. Bạn vẫn muốn ghi thêm?")) return;

    transferSubmittingRef.current = true;
    try {
      if (!existing) saveTransaction(transaction);
      markLineAdjusted({
        accountId,
        adjustedAt: transaction.updatedAt,
        checkId: check.id,
        transactionId: transaction.id,
      });
      const counterpartId = line.difference < 0 ? to.id : from.id;
      const counterpart = check.lines.find((item) => item.accountId === counterpartId);
      if (counterpart && !counterpart.adjustmentTransactionId &&
        counterpart.reason === "internal_transfer" &&
        counterpart.difference === -line.difference) {
        markLineAdjusted({
          accountId: counterpartId,
          adjustedAt: transaction.updatedAt,
          checkId: check.id,
          transactionId: transaction.id,
        });
      }
      setTransferDraft(null);
      showSuccessToast(`Đã ghi chuyển ${formatMoney(transaction.amount)} từ ${from.name} sang ${to.name}.`);
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : "Không thể ghi giao dịch chuyển tiền.");
    } finally {
      transferSubmittingRef.current = false;
    }
  }

  function removeCheck(check: AccountReconciliation) {
    const hasAdjustment = check.lines.some(
      (line) => line.adjustmentTransactionId
    );
    const message = hasAdjustment
      ? "Xóa lần kiểm kê này? Các giao dịch đã tạo trong Sổ tài khoản vẫn được giữ."
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
          <span>Dự kiến kiểm kê gần nhất</span>
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
                Bỏ trống tài khoản chưa muốn kiểm kê. Số dư dự kiến của mỗi tài khoản
                đã là số có thể dùng sau khi trừ tiền còn ở ngoài vào ngày đã chọn.
                Hãy nhập số tiền thực tế bạn có thể dùng.
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
              const basis = reconciliationBases[account.id];
              const bookBalance = savedLine?.bookBalance ?? basis.bookBalance;
              const externalAmount = savedLine?.externalAmount ?? basis.externalAmount;
              const visibleBookBalance = bookBalance - (reconciliationSavings[account.id] ?? 0);
              const hasSavedBasis = !savedLine ||
                (savedLine.bookBalance !== undefined && savedLine.externalAmount !== undefined);
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
                      <small>
                        {hasSavedBasis ? "Thực có dự kiến" : "Dự kiến đã lưu"} {formatMoney(expected)}
                      </small>
                      {hasSavedBasis ? (
                        <small>
                          Sổ {formatMoney(visibleBookBalance)} − tiền ở ngoài {formatMoney(externalAmount)}
                        </small>
                      ) : (
                        <small>Giữ nguyên số dự kiến của lần kiểm kê cũ.</small>
                      )}
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
                    {isAdjusted && <small>{savedLine?.reason === "internal_transfer" ? "Đã ghi chuyển tiền vào sổ" : "Đã điều chỉnh trong sổ"}</small>}
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
              <span>Dự kiến kiểm kê</span>
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
                      {canAdjust ? "Điều chỉnh sổ" : line.reason === "internal_transfer" ? "Ghi chuyển tiền" : "Xử lý"}
                      <ArrowRight aria-hidden="true" size={16} />
                    </button>
                    {line.reason === "internal_transfer" &&
                      transferDraft?.checkId === check.id &&
                      transferDraft.accountId === line.accountId && (
                        <form className="reconciliation-transfer-form"
                          onSubmit={(event) => submitTransfer(event, check, line.accountId)}>
                          <p>
                            Ghi một lần chuyển {formatMoney(Math.abs(line.difference))} ngày {formatDate(check.date)}.
                            {" "}{line.difference < 0 ? `${line.accountName} là tài khoản gửi.` : `${line.accountName} là tài khoản nhận.`}
                          </p>
                          <label className="reconciliation-field">
                            <span>Tài khoản gửi</span>
                            <select required value={transferDraft.fromAccountId}
                              onChange={(event) => setTransferDraft((current) =>
                                current ? { ...current, fromAccountId: event.target.value } : current)}>
                              <option value="">Chọn tài khoản gửi</option>
                              {activeAccounts.map((account) => (
                                <option key={account.id} value={account.id}>{account.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="reconciliation-field">
                            <span>Tài khoản nhận</span>
                            <select required value={transferDraft.toAccountId}
                              onChange={(event) => setTransferDraft((current) =>
                                current ? { ...current, toAccountId: event.target.value } : current)}>
                              <option value="">Chọn tài khoản nhận</option>
                              {activeAccounts.map((account) => (
                                <option key={account.id} value={account.id}>{account.name}</option>
                              ))}
                            </select>
                          </label>
                          <div className="reconciliation-transfer-actions">
                            <button className="notification-secondary-button" onClick={() => setTransferDraft(null)} type="button">Hủy</button>
                            <button className="notification-primary-button" type="submit">Lưu chuyển tiền</button>
                          </div>
                        </form>
                      )}
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
                    <span>Dự kiến đã lưu</span>
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
