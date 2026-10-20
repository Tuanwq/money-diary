import { showAppToast } from "../../components/feedback/appToast.ts";
import { PopupNotice } from "../../components/feedback/PopupNotice.tsx";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import "./accountExternal.css";
import "./transactionModal.css";
import { useEffect, useMemo, useState } from "react";
import { getToday } from "../../utils/date";
import { getJarView, suggestJar, type JarActivity, type JarLedger, type SpendingJar } from
  "../spending-jars/domain/jarModel.ts";
import { getFinancialPosition } from "../spending-jars/domain/financialPosition.ts";
import type { JarCommand } from "../spending-jars/services/jarService.ts";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "../../utils/money";
import {
  ACCOUNT_TYPE_LABELS,
  TRANSACTION_PURPOSE_LABELS,
  TRANSACTION_TYPE_LABELS,
  calculateAccountBalance,
  getDefaultTransactionPurpose,
  getLedgerSummary,
  type AccountTransaction,
  type AccountTransactionType,
  type TransactionPurpose,
  type FinancialAccount,
  type FinancialAccountType,
  type BudgetEligibility,
  type TransactionCategory,
} from "./accountLedgerModel";
import { categoriesForType, findJarLinkedCategoryId, resolveCategorySelection, type CategoryCommand } from "./transactionCategories.ts";
import { TransactionCategoryManager } from "./TransactionCategoryManager.tsx";
import { AccountExternalForm, AccountExternalSection, type ExternalDialog } from "./AccountExternalMoney.tsx";
import { calculateAccountActualAvailable, calculateAccountExternalAmount,
  calculateActualAvailableBalance, calculateTotalExternalAmount,
  type AccountExternalCommand, type AccountExternalEntry } from "./accountExternalModel.ts";

const TRANSACTIONS_PER_PAGE = 8;

const ACCOUNT_ICONS = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: WalletCards,
  other: CreditCard,
} satisfies Record<FinancialAccountType, typeof Banknote>;

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function AccountForm({
  account,
  onClose,
  onSave,
}: {
  account: FinancialAccount | null;
  onClose: () => void;
  onSave: (account: FinancialAccount) => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<FinancialAccountType>(
    account?.type ?? "cash"
  );
  const [openingBalance, setOpeningBalance] = useState(
    account ? formatMoneyInput(String(account.openingBalance)) : ""
  );
  const [budgetEligibility, setBudgetEligibility] = useState<BudgetEligibility>(account?.budgetEligibility ?? "needs_review");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      showAppToast("Bạn chưa nhập tên tài khoản.");
      return;
    }

    const now = new Date().toISOString();

    try { onSave({
      ...account,
      createdAt: account?.createdAt ?? now,
      id: account?.id ?? crypto.randomUUID(),
      name: trimmedName,
      openingBalance: parseMoneyInput(openingBalance),
      type,
      budgetEligibility,
      updatedAt: now,
    }); onClose(); }
    catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Không thể lưu tài khoản."); }
  }

  return (
    <div
      className="ledger-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="ledger-modal" onSubmit={handleSubmit}>
        <header className="ledger-modal-header">
          <div>
            <span>Tài khoản tài chính</span>
            <h2>{account ? "Chỉnh sửa tài khoản" : "Thêm tài khoản"}</h2>
          </div>
          <button
            aria-label="Đóng form tài khoản"
            className="ledger-icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <label className="ledger-field">
          <span>Tên tài khoản</span>
          <input
            autoFocus
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="VD: Vietcombank"
            value={name}
          />
        </label>

        <label className="ledger-field">
          <span>Dùng tiền tài khoản này cho hũ?</span>
          <select value={budgetEligibility} onChange={(event) =>
            setBudgetEligibility(event.target.value as BudgetEligibility)}>
            <option value="needs_review">Cần xem lại</option>
            <option value="eligible">Có thể phân bổ</option>
            <option value="excluded">Không phân bổ</option>
          </select>
          <small>Tiền trong hũ vẫn nằm ở tài khoản; lựa chọn này chỉ kiểm soát phần có thể dành thêm.</small>
        </label>

        <label className="ledger-field">
          <span>Loại tài khoản</span>
          <select
            onChange={(event) =>
              setType(event.target.value as FinancialAccountType)
            }
            value={type}
          >
            {(
              Object.keys(ACCOUNT_TYPE_LABELS) as FinancialAccountType[]
            ).map((accountType) => (
              <option key={accountType} value={accountType}>
                {ACCOUNT_TYPE_LABELS[accountType]}
              </option>
            ))}
          </select>
        </label>

        <label className="ledger-field">
          <span>Số dư đầu kỳ</span>
          <div className="ledger-money-input">
            <input
              inputMode="numeric"
              onChange={(event) =>
                setOpeningBalance(formatMoneyInput(event.target.value))
              }
              placeholder="VD: 5.000.000"
              value={openingBalance}
            />
            <span>đ</span>
          </div>
          {account && (
            <small>
              Thay đổi số dư đầu kỳ sẽ tính lại số dư hiện tại nhưng không sửa
              lịch sử giao dịch.
            </small>
          )}
        </label>

        <footer className="ledger-modal-actions">
          <button
            className="notification-secondary-button"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button className="notification-primary-button" type="submit">
            Lưu tài khoản
          </button>
        </footer>
      </form>
    </div>
  );
}

function TransactionForm({
  accounts,
  categories,
  transactions,
  onCategoryCommand,
  jarLedger,
  onJarCommand,
  onClose,
  onSave,
  transaction,
}: {
  accounts: FinancialAccount[];
  categories: TransactionCategory[];
  transactions: AccountTransaction[];
  onCategoryCommand: (command: CategoryCommand) => void;
  jarLedger: JarLedger;
  onJarCommand: (command: JarCommand) => void;
  onClose: () => void;
  onSave: (transaction: AccountTransaction) => void;
  transaction: AccountTransaction | null;
}) {
  const firstAccountId = accounts[0]?.id ?? "";
  const [type, setType] = useState<AccountTransactionType>(
    transaction?.type ?? "expense"
  );
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? firstAccountId
  );
  const [toAccountId, setToAccountId] = useState(
    transaction?.toAccountId ??
      accounts.find((account) => account.id !== firstAccountId)?.id ??
      ""
  );
  const [date, setDate] = useState(transaction?.date ?? getToday());
  const [amount, setAmount] = useState(
    transaction ? formatMoneyInput(String(transaction.amount)) : ""
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ??
    categoriesForType(categories, type).find((item) => item.name === transaction?.category)?.id ??
    categoriesForType(categories, type)[0]?.id ?? "");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const activeCategoryId = categoriesForType(categories, type).some((item) => item.id === categoryId)
    ? categoryId : "";
  const category = type === "transfer" ? "Chuyển nội bộ" :
    categories.find((item) => item.id === activeCategoryId)?.name ?? "";
  const [note, setNote] = useState(transaction?.note ?? "");
  const [purpose, setPurpose] = useState<TransactionPurpose | "">(
    transaction?.purpose ?? (transaction ? "" : getDefaultTransactionPurpose(type))
  );
  const [purposeTouched, setPurposeTouched] = useState(false);
  const [jarId, setJarId] = useState("");
  const [jarChoiceTouched, setJarChoiceTouched] = useState(false);
  const [jarSourceId, setJarSourceId] = useState("");
  const suggestedJar = type === "expense" && !transaction ? suggestJar(jarLedger, category) : undefined;
  const selectedJarId = type === "expense" && !transaction
    ? (jarChoiceTouched ? jarId : suggestedJar?.id ?? "") : "";
  const selectedJar = jarLedger.jars.find((jar) => jar.id === selectedJarId && jar.status === "active");
  const effectivePurpose = selectedJar && !purposeTouched ? "goal_allocation" : purpose;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function changeType(nextType: AccountTransactionType) {
    setType(nextType);
    setCategoryId(categoriesForType(categories, nextType)[0]?.id ?? "");
    setPurpose(getDefaultTransactionPurpose(nextType));
    setPurposeTouched(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);

    if ((!selectedJar && !accountId) || parsedAmount <= 0) {
      showAppToast("Hãy chọn tài khoản và nhập số tiền lớn hơn 0.");
      return;
    }

    if (type === "transfer" && (!toAccountId || toAccountId === accountId)) {
      showAppToast("Tài khoản nhận phải khác tài khoản chuyển.");
      return;
    }

    if (!effectivePurpose) {
      showAppToast("Hãy chọn giao dịch này ảnh hưởng đến mục tiêu như thế nào.");
      return;
    }

    const now = new Date().toISOString();

    try {
      if (selectedJar) {
        onJarCommand({ kind: "spend", id: crypto.randomUUID(), now, jarId: selectedJar.id,
          accountId: jarSourceId || undefined, amount: parsedAmount, date, category,
          note: note.trim(), purpose: effectivePurpose === "goal_allocation" ? "goal_allocation" : "daily_expense" });
        onClose();
        return;
      }
      const selectedCategory = resolveCategorySelection(categories, type, activeCategoryId);
      onSave({
        ...transaction,
        accountId,
        amount: parsedAmount,
        ...selectedCategory,
        createdAt: transaction?.createdAt ?? now,
        date,
        id: transaction?.id ?? crypto.randomUUID(),
        note: note.trim(),
        purpose: effectivePurpose,
        // Preserve ambiguous legacy provenance when editing old rows.
        source: transaction ? transaction.source : "manual",
        ...(type === "transfer" ? { toAccountId } : {}),
        type,
        updatedAt: now,
      });
      onClose();
    } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : "Không thể lưu giao dịch.");
    }
  }

  return (
    <div
      className="ledger-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="ledger-modal ledger-transaction-modal" onSubmit={handleSubmit}>
        <header className="ledger-modal-header">
          <div>
            <span>Sổ giao dịch</span>
            <h2>{transaction ? "Chỉnh sửa giao dịch" : "Thêm giao dịch"}</h2>
          </div>
          <button
            aria-label="Đóng form giao dịch"
            className="ledger-icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="ledger-transaction-type" role="group" aria-label="Loại giao dịch">
          {(["income", "expense", "transfer"] as const).map(
            (transactionType) => (
              <button
                className={type === transactionType ? "is-active" : ""}
                key={transactionType}
                onClick={() => changeType(transactionType)}
                type="button"
              >
                {TRANSACTION_TYPE_LABELS[transactionType]}
              </button>
            )
          )}
        </div>

        <div className="ledger-form-grid">
          {!selectedJar && <label className="ledger-field">
            <span>
              {type === "transfer" ? "Từ tài khoản" : "Tài khoản"}
            </span>
            <select
              onChange={(event) => setAccountId(event.target.value)}
              value={accountId}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>}

          <label className={`ledger-field${selectedJar ? " ledger-field-wide" : ""}`}>
            <span>Ngày giao dịch</span>
            <input
              max={getToday()}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>

          <label className="ledger-field">
            <span>Số tiền</span>
            <div className="ledger-money-input">
              <input
                inputMode="numeric"
                onChange={(event) =>
                  setAmount(formatMoneyInput(event.target.value))
                }
                placeholder="VD: 250.000"
                value={amount}
              />
              <span>đ</span>
            </div>
          </label>

          <div className="ledger-field ledger-transaction-category">
            <div className="ledger-transaction-category-heading">
              <label htmlFor="ledger-transaction-category">Phân loại</label>
              {type !== "transfer" && <button className="history-view-action" onClick={() => setShowCategoryManager(true)} type="button">Quản lý nhãn</button>}
            </div>
            <select
              id="ledger-transaction-category"
              onChange={(event) => setCategoryId(event.target.value)}
              value={activeCategoryId}
            >
              {type === "transfer" && <option value="">Chuyển nội bộ</option>}
              {type !== "transfer" && !activeCategoryId && <option value="">Chọn nhãn</option>}
              {categoriesForType(categories, type).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {type === "transfer" && (
            <label className="ledger-field">
              <span>Đến tài khoản</span>
              <select
                onChange={(event) => setToAccountId(event.target.value)}
                value={toAccountId}
              >
                {accounts
                  .filter((account) => account.id !== accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
          )}

          {type === "expense" && !transaction && jarLedger.jars.some((jar) => jar.status === "active") && <>
            <label className="ledger-field">
              <span>Hũ chi tiêu</span>
              <select value={selectedJarId} onChange={(event) => {
                const nextJar = jarLedger.jars.find((jar) => jar.id === event.target.value && jar.status === "active");
                const linkedCategoryId = nextJar && findJarLinkedCategoryId(categories, nextJar.linkedLabels);
                setJarChoiceTouched(true); setJarId(event.target.value); setJarSourceId(""); setPurposeTouched(false);
                if (linkedCategoryId) setCategoryId(linkedCategoryId);
              }}>
                <option value="">Không dùng hũ</option>
                {jarLedger.jars.filter((jar) => jar.status === "active").map((jar) =>
                  <option key={jar.id} value={jar.id}>{jar.icon} {jar.name} · còn {formatMoney(getJarView(jarLedger, jar).remainingAmount)}</option>)}
              </select>
            </label>
          </>}

          <label className={`ledger-field${type === "income" || (type === "expense" && (transaction || !jarLedger.jars.some((jar) => jar.status === "active"))) ? " ledger-field-wide" : ""}`}>
            <span>Ảnh hưởng mục tiêu</span>
            <select
              onChange={(event) => { setPurpose(event.target.value as TransactionPurpose); setPurposeTouched(true); }}
              required
              value={effectivePurpose}
            >
              {transaction && !transaction.purpose && <option value="">Chưa phân loại</option>}
              {type === "income" && <option value="income">{TRANSACTION_PURPOSE_LABELS.income}</option>}
              {type === "expense" && <>
                <option value="daily_expense">{TRANSACTION_PURPOSE_LABELS.daily_expense} · trừ tiến độ</option>
                <option value="goal_allocation">{TRANSACTION_PURPOSE_LABELS.goal_allocation} · không trừ</option>
              </>}
              {type === "transfer" && <option value="internal_transfer">{TRANSACTION_PURPOSE_LABELS.internal_transfer} · không trừ</option>}
            </select>
            <small>Phân bổ và chuyển nội bộ không làm giảm tiền đã kiếm được cho mục tiêu.</small>
          </label>

          {selectedJar && <label className="ledger-field ledger-field-wide">
            <span>Nguồn tiền trong hũ</span>
            <select value={jarSourceId} onChange={(event) => setJarSourceId(event.target.value)}>
              <option value="">Tự động chia theo nguồn</option>
              {getJarView(jarLedger, selectedJar).sources.filter((source) => source.amount > 0).map((source) =>
                <option key={source.accountId} value={source.accountId}>
                  {accounts.find((account) => account.id === source.accountId)?.name ?? "Tài khoản"} · {formatMoney(source.amount)}
                </option>)}
            </select>
            <small>Khoản chi sẽ trừ tiền thật ở từng tài khoản nguồn.</small>
          </label>}

          <label className="ledger-field ledger-field-wide">
            <span>Ghi chú</span>
            <textarea
              maxLength={300}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nội dung giao dịch"
              rows={3}
              value={note}
            />
          </label>
        </div>

        <footer className="ledger-modal-actions">
          <button
            className="notification-secondary-button"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button className="notification-primary-button" type="submit">
            Lưu giao dịch
          </button>
        </footer>
      </form>
      {showCategoryManager && <TransactionCategoryManager categories={categories} transactions={transactions}
        onCommand={onCategoryCommand} onClose={() => setShowCategoryManager(false)} />}
    </div>
  );
}

export function AccountLedgerPage({
  accounts,
  editTransactionId,
  onEditIntentConsumed,
  categories,
  onCategoryCommand,
  jars,
  jarActivities,
  onJarCommand,
  onExternalCommand,
  archiveAccount,
  cloudStatus,
  legacyLocalRecoveryCandidate,
  onClaimLegacyLocalLedger,
  onRetrySync,
  onUseCloudVersion,
  deleteTransaction,
  saveAccount,
  saveTransaction,
  transactions,
}: {
  accounts: FinancialAccount[];
  editTransactionId?: string | null;
  onEditIntentConsumed?: () => void;
  categories: TransactionCategory[];
  onCategoryCommand: (command: CategoryCommand) => void;
  jars: SpendingJar[];
  jarActivities: JarActivity[];
  onJarCommand: (command: JarCommand) => void;
  onExternalCommand: (command: AccountExternalCommand) => void;
  archiveAccount: (accountId: string) => void;
  cloudStatus: string;
  legacyLocalRecoveryCandidate: { accounts: number; transactions: number; jars: number } | null;
  onClaimLegacyLocalLedger: () => void;
  onRetrySync: () => void;
  onUseCloudVersion: () => void;
  deleteTransaction: (transactionId: string) => void;
  saveAccount: (account: FinancialAccount) => void;
  saveTransaction: (transaction: AccountTransaction) => void;
  transactions: AccountTransaction[];
}) {
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AccountTransactionType>(
    "all"
  );
  const [monthFilter, setMonthFilter] = useState(getToday().slice(0, 7));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingAccount, setEditingAccount] =
    useState<FinancialAccount | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<AccountTransaction | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  useEffect(() => {
    if (!editTransactionId) return;
    const timer = window.setTimeout(() => {
      const selected = transactions.find((item) => item.id === editTransactionId);
      if (selected) { setEditingTransaction(selected); setShowTransactionForm(true); }
      onEditIntentConsumed?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editTransactionId, onEditIntentConsumed, transactions]);
  const [externalDialog, setExternalDialog] = useState<ExternalDialog | null>(null);
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const summary = useMemo(
    () => getLedgerSummary(accounts, transactions, monthFilter),
    [accounts, monthFilter, transactions]
  );
  const availability = useMemo(() => {
    const ledger = { accounts, transactions, jars, jarActivities, updatedAt: "" };
    return { actual: calculateActualAvailableBalance(ledger), external: calculateTotalExternalAmount(ledger) };
  }, [accounts, transactions, jars, jarActivities]);
  const financialPosition = useMemo(() => getFinancialPosition({ accounts, transactions, jars, jarActivities }),
    [accounts, transactions, jars, jarActivities]);
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi-VN");

    return [...transactions]
      .filter((transaction) => transaction.date.startsWith(monthFilter))
      .filter(
        (transaction) =>
          selectedAccountId === "all" ||
          transaction.accountId === selectedAccountId ||
          transaction.toAccountId === selectedAccountId
      )
      .filter(
        (transaction) =>
          typeFilter === "all" || transaction.type === typeFilter
      )
      .filter((transaction) => {
        if (!normalizedSearch) return true;

        return [
          transaction.category,
          transaction.note,
          accountMap.get(transaction.accountId)?.name,
          transaction.toAccountId
            ? accountMap.get(transaction.toAccountId)?.name
            : "",
        ].some((value) =>
          value?.toLocaleLowerCase("vi-VN").includes(normalizedSearch)
        );
      })
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.updatedAt.localeCompare(left.updatedAt)
      );
  }, [
    accountMap,
    monthFilter,
    search,
    selectedAccountId,
    transactions,
    typeFilter,
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE)
  );
  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * TRANSACTIONS_PER_PAGE,
    page * TRANSACTIONS_PER_PAGE
  );

  function openNewAccount() {
    setEditingAccount(null);
    setShowAccountForm(true);
  }

  function openNewTransaction() {
    if (activeAccounts.length === 0) {
      showAppToast("Hãy tạo ít nhất một tài khoản trước.");
      return;
    }

    setEditingTransaction(null);
    setShowTransactionForm(true);
  }

  function confirmArchive(account: FinancialAccount) {
    const hasTransactions = transactions.some(
      (transaction) =>
        transaction.accountId === account.id ||
        transaction.toAccountId === account.id
    );
    const message = hasTransactions
      ? `Tài khoản "${account.name}" đã có giao dịch. Tài khoản sẽ được ẩn nhưng lịch sử vẫn được giữ.`
      : `Ẩn tài khoản "${account.name}"?`;

    if (confirm(message)) {
      try { archiveAccount(account.id); }
      catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Không thể ẩn tài khoản."); }
    }
  }

  function confirmDeleteTransaction(transaction: AccountTransaction) {
    if (
      confirm(
        `Xóa giao dịch ${formatMoney(transaction.amount)} ngày ${formatDate(
          transaction.date
        )}? Số dư tài khoản sẽ được tính lại.`
      )
    ) {
      deleteTransaction(transaction.id);
    }
  }

  return (
    <div className="account-ledger-page">
      <header className="account-ledger-header">
        <div>
          <span className="account-ledger-eyebrow">
            <CircleDollarSign aria-hidden="true" size={18} />
            Sổ tài chính
          </span>
          <h1>Tài khoản của tôi</h1>
          <p>Theo dõi số dư và dòng tiền riêng cho từng nơi giữ tiền.</p>
          <small>{cloudStatus}</small>
        </div>
        <div className="account-ledger-header-actions">
          <button
            className="notification-secondary-button"
            onClick={openNewAccount}
            type="button"
          >
            <Building2 aria-hidden="true" size={18} />
            Thêm tài khoản
          </button>
          <button
            className="notification-primary-button"
            onClick={openNewTransaction}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            Thêm giao dịch
          </button>
        </div>
      </header>

      <PopupNotice message={/xung đột|chưa thể|lỗi/i.test(cloudStatus)
        ? `${cloudStatus}. Thay đổi trên thiết bị này có thể chưa được đồng bộ.` : ""}
        actionLabel="Thử đồng bộ lại" onAction={onRetrySync}
        secondaryActionLabel={/xung đột/i.test(cloudStatus) ? "Dùng bản cloud" : undefined}
        onSecondaryAction={() => {
          if (!confirm("Dùng dữ liệu cloud mới nhất? Bản trên thiết bị sẽ được sao lưu để có thể khôi phục.")) return;
          try { onUseCloudVersion(); }
          catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Chưa thể tải dữ liệu cloud."); }
        }} />
      <PopupNotice tone="warning" message={legacyLocalRecoveryCandidate
        ? `Thiết bị còn sổ cũ chưa rõ tài khoản sở hữu (${legacyLocalRecoveryCandidate.accounts} tài khoản, ${legacyLocalRecoveryCandidate.transactions} giao dịch, ${legacyLocalRecoveryCandidate.jars} hũ). Dữ liệu này chưa được tự đồng bộ để tránh trộn hai người dùng.`
        : ""} actionLabel="Khôi phục sổ cũ" onAction={() => {
          if (!window.confirm("Chỉ khôi phục nếu sổ cũ này thuộc chính tài khoản đang đăng nhập. Bản gốc trên thiết bị sẽ được giữ. Tiếp tục?")) return;
          try { onClaimLegacyLocalLedger(); }
          catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Chưa thể khôi phục sổ cũ."); }
        }} />

      <section className="account-ledger-summary has-availability" aria-label="Tóm tắt sổ tài khoản">
        <div className="is-balance">
          <span>Tổng số dư</span>
          <strong>{formatMoney(summary.totalBalance)}</strong>
        </div>
        <div className="is-actual">
          <span>Tiền thực tế có</span>
          <strong>{formatMoney(availability.actual)}</strong>
          <small>{availability.external > 0 ? `Sau khi trừ ${formatMoney(availability.external)} đang ở ngoài` : "Có thể dùng ngay"}</small>
        </div>
        <div>
          <span>Thu trong tháng</span>
          <strong className="is-income">{formatMoney(summary.income)}</strong>
        </div>
        <div>
          <span>Chi ròng trong tháng</span>
          <strong className={summary.expense < 0 ? "is-income" : "is-expense"}>{formatMoney(summary.expense)}</strong>
        </div>
        <div className="is-transfer">
          <div className="account-ledger-transfer-copy">
            <span><ArrowLeftRight aria-hidden="true" size={16} /> Tiền chuyển giữa các tài khoản</span>
            <small>Tổng luân chuyển trong tháng · không phải thu hoặc chi, không làm thay đổi tổng số dư.</small>
          </div>
          <strong>{formatMoney(summary.transfer)}</strong>
        </div>
      </section>

      <section className="account-ledger-accounts">
        <div className="account-ledger-section-heading">
          <div>
            <h2>Số dư theo tài khoản</h2>
            <p>{activeAccounts.length} tài khoản đang hoạt động.</p>
          </div>
          <button
            className={`account-ledger-all-filter ${
              selectedAccountId === "all" ? "is-active" : ""
            }`}
            onClick={() => {
              setSelectedAccountId("all");
              setPage(1);
            }}
            type="button"
          >
            Tất cả
          </button>
        </div>

        <div className="account-card-grid">
          {activeAccounts.map((account) => {
            const Icon = ACCOUNT_ICONS[account.type];
            const balance = calculateAccountBalance(account, transactions);
            const external = calculateAccountExternalAmount(account);
            const budgetRow = financialPosition.accounts.find((item) => item.accountId === account.id);

            return (
              <article
                className={`account-balance-card ${
                  selectedAccountId === account.id ? "is-selected" : ""
                }`}
                key={account.id}
              >
                <button
                  className="account-balance-main"
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setPage(1);
                  }}
                  type="button"
                >
                  <span className="account-balance-icon">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span>
                    <small>{ACCOUNT_TYPE_LABELS[account.type]}</small>
                    <strong>{account.name}</strong>
                  </span>
                  <b>{formatMoney(balance)}</b>
                </button>
                <div className="account-external-breakdown">
                  <span>Thực có <strong>{formatMoney(calculateAccountActualAvailable(account, transactions))}</strong></span>
                  {external > 0 && <span className="is-outside">Đang ở ngoài <strong>{formatMoney(external)}</strong></span>}
                  <span>Đã dành trong hũ <strong>{formatMoney(budgetRow?.reserved ?? 0)}</strong></span>
                  <span>Chưa dành cho hũ <strong>{formatMoney(budgetRow?.unallocated ?? 0)}</strong></span>
                  {budgetRow?.eligibility === "eligible" && <span>Có thể nạp hũ <strong>{formatMoney(budgetRow.allocationCapacity)}</strong></span>}
                  {budgetRow?.jars.map((jar) => <small key={jar.id}>{jar.name}: {formatMoney(jar.amount)}</small>)}
                  {budgetRow?.eligibility === "needs_review" && <small>Cần xem lại quyền phân bổ của tài khoản.</small>}
                  {external > balance && <small>Khoản ở ngoài đang vượt số dư. Hãy kiểm tra lại sổ.</small>}
                </div>
                <div className="account-balance-actions">
                  <span>
                    Đầu kỳ {formatMoney(account.openingBalance)}
                  </span>
                  <div>
                    <button
                      aria-label={`Sửa ${account.name}`}
                      className="ledger-icon-button"
                      onClick={() => {
                        setEditingAccount(account);
                        setShowAccountForm(true);
                      }}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label={`Ẩn ${account.name}`}
                      className="ledger-icon-button is-danger"
                      onClick={() => confirmArchive(account)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
                <button className="account-external-quick" type="button" onClick={() => {
                  setSelectedAccountId(account.id);
                  setExternalDialog({ kind: "create", accountId: account.id });
                }}>Đánh dấu tiền đang ở ngoài</button>
              </article>
            );
          })}
        </div>
      </section>

      <AccountExternalSection accounts={accounts} selectedAccountId={selectedAccountId}
        onCreate={(accountId) => setExternalDialog({ kind: "create", accountId })}
        onEdit={(entry) => setExternalDialog({ kind: "edit", accountId: entry.accountId, entry })}
        onRecover={(entry) => setExternalDialog({ kind: "recover", accountId: entry.accountId, entry })}
        onDelete={(entry: AccountExternalEntry) => {
          if (!confirm("Xóa khoản tiền đang ở ngoài này? Tổng số dư sẽ không thay đổi.")) return;
          try { onExternalCommand({ kind: "delete", accountId: entry.accountId, id: entry.id, now: new Date().toISOString() }); }
          catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Không thể xóa khoản tiền."); }
        }} />

      <section className="account-ledger-transactions">
        <div className="account-ledger-section-heading">
          <div>
            <h2>Lịch sử giao dịch</h2>
            <p>{filteredTransactions.length} giao dịch phù hợp bộ lọc.</p>
          </div>
        </div>

        <div className="account-ledger-filters">
          <label className="account-ledger-search">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Tìm giao dịch"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm nội dung, phân loại..."
              value={search}
            />
          </label>
          <input
            aria-label="Lọc theo tháng"
            className="account-ledger-month"
            onChange={(event) => {
              setMonthFilter(event.target.value);
              setPage(1);
            }}
            type="month"
            value={monthFilter}
          />
          <div className="account-ledger-type-filters">
            {(
              ["all", "income", "expense", "transfer"] as const
            ).map((filter) => (
              <button
                className={typeFilter === filter ? "is-active" : ""}
                key={filter}
                onClick={() => {
                  setTypeFilter(filter);
                  setPage(1);
                }}
                type="button"
              >
                {filter === "all"
                  ? "Tất cả"
                  : TRANSACTION_TYPE_LABELS[filter]}
              </button>
            ))}
          </div>
        </div>

        {paginatedTransactions.length === 0 ? (
          <div className="account-ledger-empty">
            <ArrowLeftRight aria-hidden="true" size={26} />
            <strong>Chưa có giao dịch trong bộ lọc</strong>
            <span>Thêm khoản thu, chi hoặc chuyển tiền để bắt đầu.</span>
          </div>
        ) : (
          <div className="account-transaction-list">
            {paginatedTransactions.map((transaction) => {
              const isIncome = transaction.type === "income";
              const isExpense = transaction.type === "expense";
              const Icon = isIncome
                ? ArrowDownLeft
                : isExpense
                  ? ArrowUpRight
                  : ArrowLeftRight;
              const sourceAccount = accountMap.get(transaction.accountId);
              const targetAccount = transaction.toAccountId
                ? accountMap.get(transaction.toAccountId)
                : null;

              return (
                <article
                  className={`account-transaction is-${transaction.type}`}
                  key={transaction.id}
                >
                  <span className="account-transaction-icon">
                    <Icon aria-hidden="true" size={19} />
                  </span>
                  <div className="account-transaction-copy">
                    <strong>{transaction.category}</strong>
                    <span>
                      {sourceAccount?.name ?? "Tài khoản đã ẩn"}
                      {targetAccount ? ` → ${targetAccount.name}` : ""}
                    </span>
                    {transaction.note && <small>{transaction.note}</small>}
                    {transaction.purpose && (
                      <small>{TRANSACTION_PURPOSE_LABELS[transaction.purpose]}</small>
                    )}
                  </div>
                  <time dateTime={transaction.date}>
                    {formatDate(transaction.date)}
                  </time>
                  <strong className="account-transaction-amount">
                    {isIncome ? "+" : isExpense ? "−" : ""}
                    {formatMoney(transaction.amount)}
                  </strong>
                  <div className="account-transaction-actions">
                    <button
                      aria-label="Sửa giao dịch"
                      className="ledger-icon-button"
                      onClick={() => {
                        setEditingTransaction(transaction);
                        setShowTransactionForm(true);
                      }}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label="Xóa giao dịch"
                      className="ledger-icon-button is-danger"
                      onClick={() => confirmDeleteTransaction(transaction)}
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

        {totalPages > 1 && (
          <div className="account-ledger-pagination">
            <button
              aria-label="Trang giao dịch trước"
              className="ledger-icon-button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span>
              Trang {page}/{totalPages}
            </span>
            <button
              aria-label="Trang giao dịch sau"
              className="ledger-icon-button"
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
        )}
      </section>

      {showAccountForm && (
        <AccountForm
          account={editingAccount}
          onClose={() => setShowAccountForm(false)}
          onSave={saveAccount}
        />
      )}
      {externalDialog && <AccountExternalForm key={`${externalDialog.kind}-${externalDialog.kind === "create" ? externalDialog.accountId : externalDialog.entry.id}`}
        accounts={activeAccounts} transactions={transactions} dialog={externalDialog}
        onClose={() => setExternalDialog(null)} onCommand={onExternalCommand} />}
      {showTransactionForm && (
        <TransactionForm
          accounts={activeAccounts}
          categories={categories}
          transactions={transactions}
          onCategoryCommand={onCategoryCommand}
          jarLedger={{ accounts, transactions, jars, jarActivities }}
          onJarCommand={onJarCommand}
          onClose={() => setShowTransactionForm(false)}
          onSave={saveTransaction}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}
