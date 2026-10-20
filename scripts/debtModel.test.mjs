import assert from "node:assert/strict";
import { createDefaultLedger, calculateAccountBalance, getLedgerSummary } from "../src/features/account-ledger/accountLedgerModel.ts";
import { applyDebtCommand, getDebtNetAssets, getDebtRemaining, getDebtStatus } from "../src/features/account-ledger/debtModel.ts";
import { calculateActualAvailableBalance } from "../src/features/account-ledger/accountExternalModel.ts";
import { areLedgerContentsEqual, decideLedgerLoad, hasLocalOnlyRecords } from "../src/features/account-ledger/ledgerSync.ts";

const now = "2026-10-20T10:00:00.000Z";
const bidv = "money-account-bank";
const cash = "money-account-cash";
const initial = createDefaultLedger();
initial.accounts = initial.accounts.map((item) => item.id === bidv
  ? { ...item, name: "BIDV", openingBalance: 3_000_000 }
  : { ...item, openingBalance: 0 });
const balance = (ledger, id) => calculateAccountBalance(ledger.accounts.find((item) => item.id === id), ledger.transactions);
const fields = (kind, principal, origin = "account", originAccountId = bidv) => ({
  kind, person: "Nam", principal, incurredDate: "2026-10-20", dueDate: "2026-11-20",
  origin, originAccountId, note: "Khoản gốc",
});

const loanCommand = { kind: "create", id: "loan-1", fields: fields("receivable", 1_000_000), now };
assert.throws(() => applyDebtCommand(initial, { ...loanCommand, fields: {
  ...loanCommand.fields, incurredDate: "2026-02-31",
} }), /không hợp lệ/);
let ledger = applyDebtCommand(initial, loanCommand);
assert.equal(balance(ledger, bidv), 2_000_000);
assert.equal(getDebtRemaining(ledger.debts[0]), 1_000_000);
assert.equal(getDebtNetAssets(ledger).netAssets, 3_000_000);
assert.deepEqual([getLedgerSummary(ledger.accounts, ledger.transactions, "2026-10").income,
  getLedgerSummary(ledger.accounts, ledger.transactions, "2026-10").expense], [0, 0]);
assert.equal(applyDebtCommand(ledger, loanCommand), ledger, "replayed origin must not duplicate cash");
assert.throws(() => applyDebtCommand(ledger, { ...loanCommand, fields: fields("receivable", 900_000) }), /đã được dùng/);

const pay = { kind: "pay", id: "loan-1", paymentId: "payment-1", amount: 400_000,
  date: "2026-10-21", accountId: bidv, note: "Một phần", now };
ledger = applyDebtCommand(ledger, pay);
assert.equal(balance(ledger, bidv), 2_400_000);
assert.equal(getDebtRemaining(ledger.debts[0]), 600_000);
assert.equal(getDebtStatus(ledger.debts[0], "2026-10-22"), "partial");
assert.equal(getDebtNetAssets(ledger).netAssets, 3_000_000);
assert.equal(applyDebtCommand(ledger, pay), ledger, "replayed payment must not duplicate cash");
assert.throws(() => applyDebtCommand(ledger, { ...pay, amount: 300_000 }), /đã được dùng/);

ledger = applyDebtCommand(ledger, { kind: "pay", id: "loan-1", paymentId: "payment-2", amount: 600_000,
  date: "2026-10-22", accountId: cash, note: "Còn lại", now });
assert.equal(balance(ledger, cash), 600_000);
assert.equal(getDebtStatus(ledger.debts[0], "2026-10-23"), "settled");
assert.equal(getDebtNetAssets(ledger).netAssets, 3_000_000);

ledger = applyDebtCommand(ledger, { kind: "update_payment", id: "loan-1", paymentId: "payment-2", amount: 500_000,
  date: "2026-10-22", accountId: cash, note: "Sửa", now });
assert.equal(balance(ledger, cash), 500_000);
assert.equal(getDebtRemaining(ledger.debts[0]), 100_000);
ledger = applyDebtCommand(ledger, { kind: "void_payment", id: "loan-1", paymentId: "payment-1", now });
assert.equal(balance(ledger, bidv), 2_000_000);
assert.equal(getDebtRemaining(ledger.debts[0]), 500_000);
assert.equal(getDebtNetAssets(ledger).netAssets, 3_000_000);
assert.throws(() => applyDebtCommand(ledger, { kind: "delete", id: "loan-1", now }), /hoàn tác/);
ledger = applyDebtCommand(ledger, { kind: "void_payment", id: "loan-1", paymentId: "payment-2", now });
ledger = applyDebtCommand(ledger, { kind: "delete", id: "loan-1", now });
assert.equal(balance(ledger, bidv), 3_000_000);
assert.equal(ledger.transactions.length, 0);
assert.equal(getDebtNetAssets(ledger).netAssets, 3_000_000);

let borrow = applyDebtCommand(initial, { kind: "create", id: "borrow-1", fields: fields("payable", 2_000_000, "account", cash), now });
assert.equal(balance(borrow, cash), 2_000_000);
assert.equal(getDebtNetAssets(borrow).payable, 2_000_000);
assert.equal(getDebtNetAssets(borrow).netAssets, 3_000_000);
borrow = applyDebtCommand(borrow, { kind: "pay", id: "borrow-1", paymentId: "return-1", amount: 500_000,
  date: "2026-10-21", accountId: cash, note: "Trả dần", now });
assert.equal(balance(borrow, cash), 1_500_000);
assert.equal(getDebtRemaining(borrow.debts[0]), 1_500_000);
assert.equal(getDebtNetAssets(borrow).netAssets, 3_000_000);
assert.deepEqual([getLedgerSummary(borrow.accounts, borrow.transactions, "2026-10").income,
  getLedgerSummary(borrow.accounts, borrow.transactions, "2026-10").expense], [0, 0]);
assert.throws(() => applyDebtCommand(borrow, { kind: "pay", id: "borrow-1", paymentId: "overpay",
  amount: 1_500_001, date: "2026-10-21", accountId: cash, note: "", now }), /không vượt/);
assert.equal(getDebtStatus(borrow.debts[0], "2026-11-21"), "overdue");
borrow = applyDebtCommand(borrow, { kind: "update_payment", id: "borrow-1", paymentId: "return-1",
  amount: 500_000, date: "2026-10-21", accountId: bidv, note: "Đổi tài khoản", now });
assert.equal(balance(borrow, cash), 2_000_000);
assert.equal(balance(borrow, bidv), 2_500_000);

const moved = applyDebtCommand(borrow, { kind: "update", id: "borrow-1",
  fields: { ...fields("payable", 2_000_000, "account", bidv), person: "Lan" }, now });
assert.equal(balance(moved, cash), 0, "editing origin removes the prior account movement");
assert.equal(balance(moved, bidv), 4_500_000, "linked payment is kept and origin moves atomically");
assert.equal(moved.transactions.filter((item) => item.debtId === "borrow-1").length, 2);
assert.equal(getDebtNetAssets(moved).netAssets, 3_000_000);

let opening = applyDebtCommand(initial, { kind: "create", id: "old-debt", fields: fields("receivable", 700_000, "opening"), now });
assert.equal(balance(opening, bidv), 3_000_000);
assert.equal(opening.transactions.length, 0);
opening = applyDebtCommand(opening, { kind: "pay", id: "old-debt", paymentId: "unlinked", amount: 100_000,
  date: "2026-10-21", note: "Chưa đối chiếu", now });
assert.equal(balance(opening, bidv), 3_000_000);
assert.equal(getDebtNetAssets(opening).unlinkedPayments, true);
assert.equal(opening.transactions.length, 0);
assert.equal(areLedgerContentsEqual(initial, opening), false);
assert.equal(hasLocalOnlyRecords(opening, initial), true);
assert.equal(decideLedgerLoad(opening, { ...initial, updatedAt: "2026-10-21T00:00:00.000Z" }, initial.updatedAt),
  "conflict", "a stale device must not overwrite newly synced debt records");

const legacy = structuredClone(initial);
legacy.accounts[1].externalEntries = [{ id: "legacy", accountId: bidv, amount: 300_000,
  type: "loaned", note: "cũ", date: "2026-10-20", recoveries: [], createdAt: now, updatedAt: now }];
assert.equal(calculateActualAvailableBalance(legacy), 2_700_000);
assert.equal(getDebtNetAssets(legacy).netAssets, 3_000_000, "legacy receivable is already in book balance");

console.log("Debt model tests passed");
