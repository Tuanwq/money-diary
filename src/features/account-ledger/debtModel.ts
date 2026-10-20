import { calculateAccountBalance, type AccountLedgerData, type AccountTransaction } from "./accountLedgerModel.ts";

export type DebtKind = "receivable" | "payable";
export type DebtOrigin = "opening" | "account";
export type DebtPayment = {
  id: string;
  amount: number;
  date: string;
  accountId?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  voidedAt?: string;
};
export type Debt = {
  id: string;
  kind: DebtKind;
  person: string;
  principal: number;
  incurredDate: string;
  dueDate?: string;
  origin: DebtOrigin;
  originAccountId?: string;
  note: string;
  payments: DebtPayment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
export type DebtFields = Pick<Debt, "kind" | "person" | "principal" | "incurredDate" | "dueDate" | "origin" | "originAccountId" | "note">;
export type DebtCommand =
  | { kind: "create"; id: string; fields: DebtFields; now: string }
  | { kind: "update"; id: string; fields: DebtFields; now: string }
  | { kind: "delete"; id: string; now: string }
  | { kind: "pay"; id: string; paymentId: string; amount: number; date: string; accountId?: string; note: string; now: string }
  | { kind: "update_payment"; id: string; paymentId: string; amount: number; date: string; accountId?: string; note: string; now: string }
  | { kind: "void_payment"; id: string; paymentId: string; now: string };

export const originTransactionId = (debtId: string) => `debt:${debtId}:origin`;
export const paymentTransactionId = (debtId: string, paymentId: string) => `debt:${debtId}:payment:${paymentId}`;
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
};
const validAmount = (value: number) => Number.isSafeInteger(value) && value > 0;

export function getDebtPaid(debt: Debt): number {
  return debt.payments.reduce((sum, payment) => sum + (payment.voidedAt ? 0 : payment.amount), 0);
}
export function getDebtRemaining(debt: Debt): number {
  return debt.deletedAt ? 0 : Math.max(0, debt.principal - getDebtPaid(debt));
}
export function getDebtStatus(debt: Debt, today: string): "open" | "partial" | "settled" | "overdue" {
  const remaining = getDebtRemaining(debt);
  if (!remaining) return "settled";
  if (debt.dueDate && debt.dueDate < today) return "overdue";
  return getDebtPaid(debt) ? "partial" : "open";
}
export function getDebtTotals(debts: Debt[]) {
  return debts.filter((debt) => !debt.deletedAt).reduce((sum, debt) => {
    sum[debt.kind] += getDebtRemaining(debt);
    return sum;
  }, { receivable: 0, payable: 0 });
}
/** Legacy outside annotations are already included in book balance; never add them again. */
export function getDebtNetAssets(ledger: AccountLedgerData) {
  const cash = ledger.accounts.filter((account) => !account.archivedAt)
    .reduce((sum, account) => sum + calculateAccountBalance(account, ledger.transactions), 0);
  const totals = getDebtTotals(ledger.debts ?? []);
  const unlinkedPayments = (ledger.debts ?? []).some((debt) => !debt.deletedAt &&
    debt.payments.some((payment) => !payment.voidedAt && !payment.accountId));
  return { cash, ...totals, netAssets: cash + totals.receivable - totals.payable, unlinkedPayments };
}

function accountFor(ledger: AccountLedgerData, accountId?: string) {
  const account = ledger.accounts.find((item) => item.id === accountId && !item.archivedAt);
  if (!account) throw new Error("Hãy chọn tài khoản đang hoạt động.");
  return account;
}
function validateFields(ledger: AccountLedgerData, fields: DebtFields, paid: number) {
  if (!validAmount(fields.principal) || fields.principal < paid)
    throw new Error("Số tiền gốc phải lớn hơn 0 và không nhỏ hơn số đã thanh toán.");
  if (!fields.person.trim()) throw new Error("Hãy nhập người liên quan.");
  if (!validDate(fields.incurredDate) || (fields.dueDate && (!validDate(fields.dueDate) || fields.dueDate < fields.incurredDate)))
    throw new Error("Ngày phát sinh hoặc hạn trả không hợp lệ.");
  if (fields.origin === "account") accountFor(ledger, fields.originAccountId);
  else if (fields.origin !== "opening") throw new Error("Nguồn phát sinh không hợp lệ.");
  if (fields.kind !== "receivable" && fields.kind !== "payable") throw new Error("Loại công nợ không hợp lệ.");
}
function cashTransaction(debt: Debt, amount: number, date: string, accountId: string,
  paymentId: string | undefined, now: string): AccountTransaction {
  const outward = paymentId ? debt.kind === "payable" : debt.kind === "receivable";
  return {
    id: paymentId ? paymentTransactionId(debt.id, paymentId) : originTransactionId(debt.id),
    debtId: debt.id, debtPaymentId: paymentId, debtDirection: outward ? "out" : "in",
    accountId, amount, date, category: debt.kind === "receivable" ? "Nợ phải thu" : "Nợ phải trả",
    note: paymentId ? `Thanh toán công nợ · ${debt.person}` : `Phát sinh công nợ · ${debt.person}`,
    purpose: "debt_principal", source: "debt", type: "debt", createdAt: now, updatedAt: now,
  };
}
function validateOutboundBalances(before: AccountLedgerData, after: AccountLedgerData) {
  for (const account of after.accounts.filter((item) => !item.archivedAt)) {
    const previous = calculateAccountBalance(account, before.transactions);
    const next = calculateAccountBalance(account, after.transactions);
    if (next < 0 && next < previous)
      throw new Error(`Tài khoản ${account.name} không đủ số dư cho khoản công nợ.`);
  }
}

/** Debt and its cash transaction change in one ledger revision. Replayed IDs are harmless. */
export function applyDebtCommand(ledger: AccountLedgerData, command: DebtCommand): AccountLedgerData {
  const debts = ledger.debts ?? [];
  const existing = debts.find((item) => item.id === command.id);
  if (command.kind === "create") {
    if (existing) {
      const fields = command.fields;
      if (!existing.deletedAt && existing.kind === fields.kind && existing.person === fields.person.trim() &&
        existing.principal === fields.principal && existing.incurredDate === fields.incurredDate &&
        existing.dueDate === (fields.dueDate || undefined) && existing.origin === fields.origin &&
        existing.originAccountId === (fields.origin === "account" ? fields.originAccountId : undefined) &&
        existing.note === fields.note.trim()) return ledger;
      throw new Error("Mã khoản nợ đã được dùng cho nội dung khác.");
    }
    validateFields(ledger, command.fields, 0);
    const debt: Debt = { ...command.fields, person: command.fields.person.trim(), note: command.fields.note.trim(),
      originAccountId: command.fields.origin === "account" ? command.fields.originAccountId : undefined,
      id: command.id, payments: [], createdAt: command.now, updatedAt: command.now };
    const next = { ...ledger, debts: [...debts, debt], transactions: debt.originAccountId
      ? [cashTransaction(debt, debt.principal, debt.incurredDate, debt.originAccountId, undefined, command.now), ...ledger.transactions]
      : ledger.transactions };
    validateOutboundBalances(ledger, next);
    return next;
  }
  if (!existing) throw new Error("Không tìm thấy khoản công nợ.");
  if (command.kind === "delete" && existing.deletedAt) return ledger;
  if (existing.deletedAt) throw new Error("Khoản công nợ đã đóng.");
  let changed: Debt;
  let transactions = ledger.transactions;
  if (command.kind === "update") {
    validateFields(ledger, command.fields, getDebtPaid(existing));
    if (existing.payments.some((item) => !item.voidedAt && item.date < command.fields.incurredDate))
      throw new Error("Ngày phát sinh không thể sau lần thanh toán.");
    changed = { ...existing, ...command.fields, person: command.fields.person.trim(), note: command.fields.note.trim(),
      originAccountId: command.fields.origin === "account" ? command.fields.originAccountId : undefined,
      updatedAt: command.now };
    transactions = transactions.filter((item) => item.id !== originTransactionId(existing.id));
    if (changed.originAccountId) transactions = [cashTransaction(changed, changed.principal,
      changed.incurredDate, changed.originAccountId, undefined, command.now), ...transactions];
    transactions = transactions.filter((item) => item.debtId !== existing.id || !item.debtPaymentId);
    for (const payment of changed.payments.filter((item) => !item.voidedAt && item.accountId))
      transactions = [cashTransaction(changed, payment.amount, payment.date, payment.accountId!, payment.id, command.now), ...transactions];
  } else if (command.kind === "delete") {
    if (existing.payments.some((item) => !item.voidedAt))
      throw new Error("Hãy hoàn tác các lần thanh toán trước khi xóa khoản nợ.");
    changed = { ...existing, deletedAt: command.now, updatedAt: command.now };
    transactions = transactions.filter((item) => item.id !== originTransactionId(existing.id));
  } else {
    const payment = existing.payments.find((item) => item.id === command.paymentId);
    if (command.kind === "pay" && payment) {
      if (!payment.voidedAt && payment.amount === command.amount && payment.date === command.date &&
        payment.accountId === (command.accountId || undefined) && payment.note === command.note.trim()) return ledger;
      throw new Error("Mã lần thanh toán đã được dùng cho nội dung khác.");
    }
    if (command.kind === "void_payment" && payment?.voidedAt) return ledger;
    if (command.kind !== "pay" && (!payment || payment.voidedAt)) throw new Error("Không tìm thấy lần thanh toán.");
    if (command.kind === "pay" || command.kind === "update_payment") {
      const remainingWithPrevious = getDebtRemaining(existing) + (command.kind === "update_payment" ? payment!.amount : 0);
      if (!validAmount(command.amount) || command.amount > remainingWithPrevious)
        throw new Error("Số tiền thanh toán phải lớn hơn 0 và không vượt số còn nợ.");
      if (!validDate(command.date) || command.date < existing.incurredDate)
        throw new Error("Ngày thanh toán không thể trước ngày phát sinh.");
      if (command.accountId) accountFor(ledger, command.accountId);
      const nextPayment: DebtPayment = { id: command.paymentId, amount: command.amount, date: command.date,
        accountId: command.accountId || undefined, note: command.note.trim(),
        createdAt: payment?.createdAt ?? command.now, updatedAt: command.now };
      changed = { ...existing, payments: command.kind === "pay" ? [...existing.payments, nextPayment]
        : existing.payments.map((item) => item.id === payment!.id ? nextPayment : item), updatedAt: command.now };
      transactions = transactions.filter((item) => item.id !== paymentTransactionId(existing.id, command.paymentId));
      if (nextPayment.accountId) transactions = [cashTransaction(changed, nextPayment.amount, nextPayment.date,
        nextPayment.accountId, nextPayment.id, command.now), ...transactions];
    } else {
      changed = { ...existing, payments: existing.payments.map((item) => item.id === payment!.id
        ? { ...item, voidedAt: command.now, updatedAt: command.now } : item), updatedAt: command.now };
      transactions = transactions.filter((item) => item.id !== paymentTransactionId(existing.id, command.paymentId));
    }
  }
  const next = { ...ledger, debts: debts.map((item) => item.id === existing.id ? changed : item), transactions };
  validateOutboundBalances(ledger, next);
  return next;
}
