import assert from "node:assert/strict";
import { createDefaultLedger } from "../src/features/account-ledger/accountLedgerModel.ts";
import { applyAccountExternalCommand, assertExternalCoverageAfterLedgerChange,
  calculateAccountActualAvailable, calculateAccountExternalAmount,
  calculateActualAvailableBalance, calculateTotalBalance, calculateTotalExternalAmount,
  getExternalOutstanding, getExternalStatus } from "../src/features/account-ledger/accountExternalModel.ts";
import { decideLedgerLoad, hasLocalOnlyRecords, isPristineLedger } from "../src/features/account-ledger/ledgerSync.ts";

const now = "2026-09-23T08:00:00.000Z";
const account = { id: "bank", name: "Vietinbank", type: "bank", openingBalance: 5_000_000,
  createdAt: now, updatedAt: now };
const initial = { ...createDefaultLedger(), accounts: [account], transactions: [] };
const fields = (amount, type) => ({ amount, type, note: "", relatedPerson: "Nam",
  date: "2026-09-23", expectedReturnDate: "2026-10-01" });
let ledger = applyAccountExternalCommand(initial, { kind: "create", accountId: "bank",
  id: "loan", now, fields: fields(1_000_000, "loaned") });
ledger = applyAccountExternalCommand(ledger, { kind: "create", accountId: "bank",
  id: "debt", now, fields: fields(500_000, "receivable") });
assert.equal(calculateTotalBalance(ledger), 5_000_000);
assert.equal(calculateTotalExternalAmount(ledger), 1_500_000);
assert.equal(calculateActualAvailableBalance(ledger), 3_500_000);
assert.equal(calculateAccountActualAvailable(ledger.accounts[0], ledger.transactions), 3_500_000);
assert.equal(ledger.transactions.length, 0, "availability annotations must not create expenses");
assert.equal(hasLocalOnlyRecords(ledger, initial), true);
const cloudCopy = JSON.parse(JSON.stringify(ledger));
assert.equal(decideLedgerLoad(initial, cloudCopy, undefined), "cloud");
assert.equal(calculateActualAvailableBalance(cloudCopy), 3_500_000,
  "another device must derive the same available amount from the synced account JSON");
assert.equal(hasLocalOnlyRecords(ledger, cloudCopy), false);
assert.equal(decideLedgerLoad(ledger, { ...cloudCopy, updatedAt: "2026-09-24T00:00:00Z" },
  initial.updatedAt), "conflict", "a stale device must not overwrite a newer cloud revision");

assert.throws(() => applyAccountExternalCommand(ledger, { kind: "create", accountId: "bank",
  id: "too-large", now, fields: fields(3_500_001, "unavailable") }), /vượt tiền/);
const recovery = { kind: "recover", accountId: "bank", id: "loan", recoveryId: "return-1",
  amount: 400_000, date: "2026-09-24", now };
ledger = applyAccountExternalCommand(ledger, recovery);
assert.equal(hasLocalOnlyRecords(ledger, cloudCopy), true,
  "a recovery changed on this device needs a safety copy before loading an older cloud row");
assert.equal(getExternalStatus(ledger.accounts[0].externalEntries[0]), "partial_returned");
assert.equal(getExternalOutstanding(ledger.accounts[0].externalEntries[0]), 600_000);
assert.equal(calculateActualAvailableBalance(ledger), 3_900_000);
assert.equal(applyAccountExternalCommand(ledger, recovery), ledger, "retries must be idempotent");
assert.throws(() => applyAccountExternalCommand(ledger, { kind: "update", accountId: "bank",
  id: "loan", now, fields: fields(399_999, "loaned") }), /đã thu hồi/);
ledger = applyAccountExternalCommand(ledger, { kind: "recover", accountId: "bank", id: "loan",
  recoveryId: "return-2", amount: 600_000, date: "2026-09-25", now });
assert.equal(getExternalStatus(ledger.accounts[0].externalEntries[0]), "returned");
assert.equal(calculateTotalExternalAmount(ledger), 500_000);
assert.equal(calculateTotalBalance(ledger), 5_000_000);
const beforeDelete = ledger;
ledger = applyAccountExternalCommand(ledger, { kind: "delete", accountId: "bank", id: "debt", now });
assert.equal(calculateAccountExternalAmount(ledger.accounts[0]), 0);
assert.equal(calculateActualAvailableBalance(ledger), 5_000_000);
assert.equal(ledger.accounts[0].externalEntries.length, 2, "soft delete keeps recovery history");
assert.equal(hasLocalOnlyRecords(beforeDelete, ledger), true,
  "a clean stale device backs up its view before loading a deletion from cloud");

const protectedLedger = applyAccountExternalCommand(initial, { kind: "create", accountId: "bank",
  id: "pending", now, fields: fields(1_500_000, "held_elsewhere") });
const expense = { id: "expense", accountId: "bank", type: "expense", amount: 4_000_000,
  category: "Khác", note: "", date: "2026-09-23", createdAt: now, updatedAt: now };
assert.throws(() => assertExternalCoverageAfterLedgerChange(protectedLedger,
  { ...protectedLedger, transactions: [expense] }), /không đủ tiền thực có/);
assert.doesNotThrow(() => assertExternalCoverageAfterLedgerChange(protectedLedger,
  { ...protectedLedger, transactions: [{ ...expense, amount: 3_000_000 }] }));
assert.equal(isPristineLedger({ ...createDefaultLedger(), accounts: createDefaultLedger().accounts.map(
  (item, index) => index ? item : { ...item, externalEntries: [{ id: "annotated" }] }) }), false);
console.log("Account external money tests passed.");
