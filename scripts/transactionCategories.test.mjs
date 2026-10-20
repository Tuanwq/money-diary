import assert from "node:assert/strict";
import test from "node:test";
import { calculateAccountBalance, createDefaultLedger } from "../src/features/account-ledger/accountLedgerModel.ts";
import { applyCategoryCommand, findJarLinkedCategoryId, linkTransactionCategory, migrateTransactionCategories } from "../src/features/account-ledger/transactionCategories.ts";
import { applyJarCommand } from "../src/features/spending-jars/services/jarService.ts";

const now = "2026-10-20T10:00:00.000Z";
const legacy = createDefaultLedger();
legacy.transactions = [{ id: "old-expense", accountId: legacy.accounts[0].id, amount: 100_000,
  type: "expense", category: "Ăn uống", date: "2026-10-20", note: "Cơm", createdAt: now, updatedAt: now,
  source: "manual" }];

test("legacy names migrate deterministically without changing balances", () => {
  const migrated = migrateTransactionCategories(legacy);
  assert.equal(migrated.transactions[0].categoryId, "category:expense%3A%C4%83n%20u%E1%BB%91ng");
  assert.deepEqual(migrateTransactionCategories(migrated), migrated);
  assert.equal(migrateTransactionCategories({ ...legacy, categories: [] }).transactions[0].categoryId,
    migrated.transactions[0].categoryId, "new cloud columns start as an empty array");
  assert.equal(calculateAccountBalance(migrated.accounts[0], migrated.transactions), -100_000);
});

test("renaming a default label keeps stable IDs, reports and jar links", () => {
  const migrated = migrateTransactionCategories(legacy);
  const id = migrated.transactions[0].categoryId;
  const withJar = { ...migrated, jars: [{ id: "jar", linkedLabels: ["Ăn uống"] }] };
  const renamed = applyCategoryCommand(withJar, { kind: "edit", id, name: "Bữa ăn", color: "#123456" });
  assert.equal(renamed.transactions[0].categoryId, id);
  assert.equal(renamed.transactions[0].category, "Bữa ăn");
  assert.deepEqual(renamed.jars[0].linkedLabels, ["Bữa ăn"]);
  assert.equal(calculateAccountBalance(renamed.accounts[0], renamed.transactions), -100_000);
});

test("deleting an in-use label can reassign or unassign without deleting transactions", () => {
  const migrated = migrateTransactionCategories(legacy);
  const id = migrated.transactions[0].categoryId;
  const replacement = migrated.categories.find((item) => item.name === "Khác" && item.type === "expense");
  const reassigned = applyCategoryCommand(migrated, { kind: "delete", id, replacementId: replacement.id, now });
  assert.equal(reassigned.transactions[0].categoryId, replacement.id);
  assert.equal(reassigned.transactions[0].amount, 100_000);
  assert.ok(reassigned.categories.find((item) => item.id === id).deletedAt);
  const unassigned = applyCategoryCommand(migrated, { kind: "delete", id, now });
  assert.equal(unassigned.transactions[0].categoryId, undefined);
  assert.equal(unassigned.transactions[0].category, "");
  assert.equal(unassigned.transactions.length, 1);
  assert.equal(migrateTransactionCategories(unassigned), unassigned,
    "deleted defaults must not be recreated during the next load");
});

test("income and expense labels can share a name while a shared label is unique", () => {
  const migrated = migrateTransactionCategories(legacy);
  const withIncome = applyCategoryCommand(migrated, { kind: "add", id: "income-travel", name: "Đi lại", type: "income" });
  const withExpense = applyCategoryCommand(withIncome, { kind: "add", id: "expense-travel", name: "Đi lại", type: "expense" });
  assert.equal(withExpense.categories.filter((item) => item.name === "Đi lại").length, 2);
  assert.throws(() => applyCategoryCommand(withExpense,
    { kind: "add", id: "shared-travel", name: "Đi lại", type: "both" }), /đã được sử dụng/);
});

test("jar-generated expense rows receive the same stable category ID", () => {
  const migrated = migrateTransactionCategories(legacy);
  const row = linkTransactionCategory({ ...legacy.transactions[0], id: "jar:one", source: "spending_jar",
    categoryId: undefined }, migrated.categories);
  assert.equal(row.categoryId, migrated.transactions[0].categoryId);
});

test("a label linked to a later jar appears in expense forms without changing money", () => {
  const migrated = migrateTransactionCategories(legacy);
  const withJar = applyJarCommand(migrated, { kind: "create", id: "new-jar", now,
    fields: { name: "Đi chơi", icon: "🫙", limitAmount: 200_000,
      startDate: "2026-10-20", linkedLabels: ["Cà phê riêng"] } });
  const jar = withJar.jars[0];
  const synced = migrateTransactionCategories(withJar);
  const id = findJarLinkedCategoryId(synced.categories, jar.linkedLabels);
  assert.ok(id);
  assert.equal(synced.categories.find((item) => item.id === id).name, "Cà phê riêng");
  assert.deepEqual(migrateTransactionCategories(synced), synced);
  assert.equal(calculateAccountBalance(synced.accounts[0], synced.transactions), -100_000);

  const unlinked = applyCategoryCommand(synced, { kind: "delete", id, now });
  assert.deepEqual(unlinked.jars[0].linkedLabels, []);
  assert.deepEqual(migrateTransactionCategories(unlinked), unlinked);
});

test("a jar label gets a fresh ID if its old name-based ID was renamed", () => {
  const migrated = migrateTransactionCategories(legacy);
  const oldId = migrated.transactions[0].categoryId;
  const renamed = applyCategoryCommand(migrated, { kind: "edit", id: oldId, name: "Bữa ăn" });
  const jar = { id: "food-jar", linkedLabels: ["Ăn uống"], status: "active", updatedAt: now };
  const synced = migrateTransactionCategories({ ...renamed, jars: [jar] });
  const newId = findJarLinkedCategoryId(synced.categories, jar.linkedLabels);
  assert.notEqual(newId, oldId);
  assert.equal(synced.transactions[0].categoryId, oldId);
  assert.deepEqual(migrateTransactionCategories(synced), synced);
});

test("linked labels match without case and stay removed after deleting their category", () => {
  const migrated = migrateTransactionCategories(legacy);
  const id = migrated.transactions[0].categoryId;
  const withJar = { ...migrated, jars: [{ id: "food-jar", linkedLabels: ["  ăn uống  "], status: "active",
    updatedAt: now }] };
  assert.equal(findJarLinkedCategoryId(withJar.categories, withJar.jars[0].linkedLabels), id);
  assert.equal(linkTransactionCategory({ ...legacy.transactions[0], category: "ăn uống", categoryId: undefined },
    withJar.categories).categoryId, id);
  const deleted = applyCategoryCommand(withJar, { kind: "delete", id, now });
  assert.deepEqual(deleted.jars[0].linkedLabels, []);
  assert.deepEqual(migrateTransactionCategories(deleted), deleted);
});
