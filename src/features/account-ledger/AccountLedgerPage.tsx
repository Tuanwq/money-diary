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
import { useEffect, useMemo, useState } from "react";
import { getToday } from "../../utils/date";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "../../utils/money";
import {
  ACCOUNT_TYPE_LABELS,
  TRANSACTION_CATEGORIES,
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
} from "./accountLedgerModel";

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
      alert("Bạn chưa nhập tên tài khoản.");
      return;
    }

    const now = new Date().toISOString();

    onSave({
      ...account,
      createdAt: account?.createdAt ?? now,
      id: account?.id ?? crypto.randomUUID(),
      name: trimmedName,
      openingBalance: parseMoneyInput(openingBalance),
      type,
      updatedAt: now,
    });
    onClose();
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
  onClose,
  onSave,
  transaction,
}: {
  accounts: FinancialAccount[];
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
  const [category, setCategory] = useState(
    transaction?.category ?? TRANSACTION_CATEGORIES[type][0]
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [purpose, setPurpose] = useState<TransactionPurpose | "">(
    transaction?.purpose ?? (transaction ? "" : getDefaultTransactionPurpose(type))
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function changeType(nextType: AccountTransactionType) {
    setType(nextType);
    setCategory(TRANSACTION_CATEGORIES[nextType][0]);
    setPurpose(getDefaultTransactionPurpose(nextType));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);

    if (!accountId || parsedAmount <= 0) {
      alert("Hãy chọn tài khoản và nhập số tiền lớn hơn 0.");
      return;
    }

    if (type === "transfer" && (!toAccountId || toAccountId === accountId)) {
      alert("Tài khoản nhận phải khác tài khoản chuyển.");
      return;
    }

    if (!purpose) {
      alert("Hãy chọn giao dịch này ảnh hưởng đến mục tiêu như thế nào.");
      return;
    }

    const now = new Date().toISOString();

    onSave({
      ...transaction,
      accountId,
      amount: parsedAmount,
      category,
      createdAt: transaction?.createdAt ?? now,
      date,
      id: transaction?.id ?? crypto.randomUUID(),
      note: note.trim(),
      purpose,
      ...(type === "transfer" ? { toAccountId } : {}),
      type,
      updatedAt: now,
    });
    onClose();
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
          <label className="ledger-field">
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
          </label>

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

          <label className="ledger-field">
            <span>Ngày</span>
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

          <label className="ledger-field">
            <span>Phân loại</span>
            <select
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {TRANSACTION_CATEGORIES[type].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="ledger-field">
            <span>Ảnh hưởng mục tiêu</span>
            <select
              onChange={(event) => setPurpose(event.target.value as TransactionPurpose)}
              required
              value={purpose}
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
    </div>
  );
}

export function AccountLedgerPage({
  accounts,
  archiveAccount,
  cloudStatus,
  deleteTransaction,
  saveAccount,
  saveTransaction,
  transactions,
}: {
  accounts: FinancialAccount[];
  archiveAccount: (accountId: string) => void;
  cloudStatus: string;
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
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const summary = useMemo(
    () => getLedgerSummary(accounts, transactions, monthFilter),
    [accounts, monthFilter, transactions]
  );
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
      alert("Hãy tạo ít nhất một tài khoản trước.");
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

    if (confirm(message)) archiveAccount(account.id);
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

      <section className="account-ledger-summary" aria-label="Tóm tắt sổ tài khoản">
        <div className="is-balance">
          <span>Tổng số dư</span>
          <strong>{formatMoney(summary.totalBalance)}</strong>
        </div>
        <div>
          <span>Thu trong tháng</span>
          <strong className="is-income">{formatMoney(summary.income)}</strong>
        </div>
        <div>
          <span>Chi trong tháng</span>
          <strong className="is-expense">{formatMoney(summary.expense)}</strong>
        </div>
        <div>
          <span>Chuyển nội bộ</span>
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
              </article>
            );
          })}
        </div>
      </section>

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
      {showTransactionForm && (
        <TransactionForm
          accounts={activeAccounts}
          onClose={() => setShowTransactionForm(false)}
          onSave={saveTransaction}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}
