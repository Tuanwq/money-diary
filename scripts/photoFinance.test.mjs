import assert from "node:assert/strict";
import test from "node:test";
import { buildPhotoTransaction } from "../src/features/photo-finance/services/photoTransactionDraft.ts";
import { calculateAccountBalance, getLedgerSummary } from "../src/features/account-ledger/accountLedgerModel.ts";
import { createPhotoDialogLock } from "../src/features/photo-finance/services/photoDialogLock.ts";
import { createSignedPhotoCache } from "../src/features/photo-finance/services/signedPhotoCache.ts";
import { formatMoneyInput, parseMoneyInput } from "../src/utils/money.ts";
import { processPhoto } from "../src/features/photo-finance/services/photoImageProcessor.ts";
import {
  buildDailyFinancialSummaries, formatCalendarNet, getCalendarDates,
  getCalendarPhotoStack, getDailyFinancialSummary, groupPhotoAttachmentsByDay,
  vietnamFinancialDate, vietnamOccurredAt,
} from "../src/features/photo-finance/services/photoFinanceModel.ts";
import { photoFinanceErrorMessage } from
  "../src/features/photo-finance/services/photoFinanceErrors.ts";

const date = "2026-09-16";
const entry = { id: "hub-day", date, income: 500_000, receivedMoney: 0,
  bonusMoney: 0, diary: "HUB", note: "", createdAt: "2026-09-16T08:00:00Z" };
const expense = { id: "legacy-cost", date, breakfast: 100_000, lunch: 0,
  dinner: 0, other: 0, note: "", createdAt: "2026-09-16T09:00:00Z" };
const photoExpense = { id: "photo-1", date, amount: 120_000, type: "expense",
  source: "photo_finance", occurredAt: "2026-09-16T11:21:00Z", createdAt: "2026-09-16T11:21:00Z" };
const photoIncome = { id: "photo-2", date, amount: 50_000, type: "income",
  source: "photo_finance", occurredAt: "2026-09-16T12:00:00Z", createdAt: "2026-09-16T12:00:00Z" };
const transfer = { id: "transfer", date, amount: 300_000, type: "transfer",
  source: "photo_finance", createdAt: "2026-09-16T12:00:00Z" };
const untaggedDuplicate = { id: "old-ledger", date, amount: 500_000, type: "income",
  createdAt: "2026-09-16T12:00:00Z" };

test("Daily Net includes HUB legacy income and photo transactions once, excluding transfer and ambiguous ledger rows", () => {
  const days = buildDailyFinancialSummaries([entry], [expense],
    [photoExpense, photoIncome, transfer, untaggedDuplicate]);
  assert.deepEqual(getDailyFinancialSummary(days, date), {
    date, income: 550_000, expense: 220_000, net: 330_000, hasData: true,
  });
  assert.equal(formatCalendarNet(395_000), "+395k");
  assert.equal(formatCalendarNet(-80_000), "−80k");
  assert.equal(formatCalendarNet(0), "0đ");
});

test("Vietnam date/time grouping is stable across UTC midnight", () => {
  assert.equal(vietnamFinancialDate(new Date("2026-09-15T18:00:00Z")), date);
  assert.equal(vietnamOccurredAt(date, "01:00"), "2026-09-15T18:00:00.000Z");
  assert.equal(getCalendarDates("2026-09").filter((day) => day.inMonth).length, 30);
});

test("calendar shows at most three photos, correct badge, cover priority and follows edits/deletes", () => {
  const attachments = Array.from({ length: 5 }, (_, index) => ({
    id: `image-${index}`, ownerId: "owner", sourceType: "account_transaction",
    sourceId: "photo-1", storagePath: `owner/${index}/display.jpg`,
    thumbnailPath: `owner/${index}/thumbnail.jpg`, isCover: index === 3,
    width: 500, height: 400, createdAt: `2026-09-16T12:0${index}:00Z`,
  }));
  const grouped = groupPhotoAttachmentsByDay(attachments, [photoExpense]);
  const stack = getCalendarPhotoStack(grouped.get(date));
  assert.equal(stack.visible.length, 3);
  assert.equal(stack.extraCount, 2);
  assert.equal(stack.visible[0].id, "image-3");
  const edited = { ...photoExpense, date: "2026-09-17" };
  assert.equal(groupPhotoAttachmentsByDay(attachments, [edited]).has(date), false);
  assert.equal(groupPhotoAttachmentsByDay(attachments, [edited]).get("2026-09-17").length, 5);
  assert.equal(groupPhotoAttachmentsByDay(attachments, []).size, 0);
  const updated = buildDailyFinancialSummaries([entry], [expense], [edited]);
  assert.equal(getDailyFinancialSummary(updated, date).net, 400_000);
  assert.equal(getDailyFinancialSummary(updated, "2026-09-17").net, -120_000);
});

test("photo persistence errors are actionable and do not expose raw Supabase messages", () => {
  assert.match(photoFinanceErrorMessage({ code: "PGRST205", message: "schema cache" }), /migration Photo Finance/);
  assert.match(photoFinanceErrorMessage(new Error("The connection to the database timed out")), /Supabase quá chậm/);
  assert.match(photoFinanceErrorMessage({ statusCode: 403, message: "Unauthorized" }), /đăng nhập lại/);
});

const accounts = [
  { id: "driver", name: "Driver", type: "e_wallet", openingBalance: 500_000 },
  { id: "bank", name: "BIDV", type: "bank", openingBalance: 200_000 },
];
const draft = { id: "photo-transfer", accounts, type: "transfer", amount: 300_000,
  accountId: "driver", toAccountId: "bank", category: "Chuyển nội bộ", purpose: "internal_transfer",
  date, time: "18:21", note: "Settlement", now: "2026-09-16T11:21:00Z" };

test("photo transfer moves both balances once without changing assets or daily income/expense", () => {
  const transaction = buildPhotoTransaction(draft);
  assert.equal(transaction.source, "photo_finance");
  assert.equal(calculateAccountBalance(accounts[0], [transaction]), 200_000);
  assert.equal(calculateAccountBalance(accounts[1], [transaction]), 500_000);
  assert.deepEqual(getLedgerSummary(accounts, [transaction], "2026-09"), {
    totalBalance: 700_000, income: 0, expense: 0, transfer: 300_000,
  });
  assert.equal(getDailyFinancialSummary(buildDailyFinancialSummaries([], [], [transaction]), date).net, 0);
  const edited = buildPhotoTransaction({ ...draft, existing: transaction, amount: 100_000 });
  assert.equal(edited.id, transaction.id);
  assert.equal(edited.type, "transfer");
  assert.equal(getLedgerSummary(accounts, [edited], "2026-09").totalBalance, 700_000);
  const income = buildPhotoTransaction({ ...draft, existing: transaction, type: "income", category: "Thu nhập" });
  assert.equal(income.toAccountId, undefined);
  assert.equal(income.purpose, "income");
});

test("photo transfer rejects missing, identical or archived destination and invalid amounts", () => {
  for (const toAccountId of [undefined, "", "driver", "missing"]) {
    assert.throws(() => buildPhotoTransaction({ ...draft, toAccountId }));
  }
  assert.throws(() => buildPhotoTransaction({ ...draft,
    accounts: [accounts[0], { ...accounts[1], archivedAt: "2026-09-16" }] }));
  for (const amount of [0, -1, NaN, Infinity, 0.5]) {
    assert.throws(() => buildPhotoTransaction({ ...draft, amount }));
  }
});

test("nested photo dialogs release scrolling in either close order and tolerate repeated cleanup", () => {
  for (const reverse of [false, true]) {
    const lock = createPhotoDialogLock();
    const style = { overflow: "auto" };
    const story = lock(style);
    const camera = lock(style);
    assert.equal(story.isTop(), false);
    assert.equal(camera.isTop(), true);
    const first = reverse ? camera : story;
    const last = reverse ? story : camera;
    first.release();
    assert.equal(style.overflow, "hidden");
    assert.equal(last.isTop(), true);
    last.release();
    last.release();
    assert.equal(style.overflow, "auto");
  }
});

test("signed photo URLs share in-flight requests, cache until expiry and retry failures", async () => {
  let now = 0;
  const calls = [];
  const cache = createSignedPhotoCache(async (paths) => {
    calls.push(paths);
    return new Map(paths.map((path) => [path, `signed:${path}:${calls.length}`]));
  }, () => now);
  const [first, second] = await Promise.all([cache.get(["owner/a", "owner/a"]), cache.get(["owner/a"])]);
  assert.equal(first.get("owner/a"), second.get("owner/a"));
  assert.equal(calls.length, 1);
  await cache.get(["owner/a", "owner/b"]);
  assert.deepEqual(calls[1], ["owner/b"]);
  cache.invalidate("owner/a");
  await cache.get(["owner/a"]);
  assert.equal(calls.length, 3);
  now = 51 * 60 * 1000;
  await cache.get(["owner/a"]);
  assert.equal(calls.length, 4);
  await cache.get(["another-owner/a"]);
  assert.equal(calls.length, 5);
  let fail = true;
  const retry = createSignedPhotoCache(async () => {
    if (fail) throw new Error("offline");
    return new Map([["a", "ok"]]);
  });
  await assert.rejects(retry.get(["a", "b"]));
  fail = false;
  assert.equal((await retry.get(["a"])).get("a"), "ok");
});

test("money input groups thousands and round-trips paste/backspace values", () => {
  assert.equal(formatMoneyInput("7000000"), "7.000.000");
  assert.equal(formatMoneyInput("7.000.000 đ"), "7.000.000");
  assert.equal(parseMoneyInput(formatMoneyInput("7000000")), 7_000_000);
  assert.equal(formatMoneyInput("7.000.00"), "700.000");
  assert.equal(formatMoneyInput(""), "");
});

test("photo processing terminates its worker on success and on abandoned selections", async () => {
  const originalWorker = globalThis.Worker;
  const originalCanvas = globalThis.OffscreenCanvas;
  const workers = [];
  class ImageWorker {
    constructor() { workers.push(this); }
    postMessage() {}
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = ImageWorker;
  globalThis.OffscreenCanvas = class {};
  try {
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const controller = new AbortController();
    const cancelled = processPhoto(file, controller.signal);
    controller.abort();
    await assert.rejects(cancelled, { name: "AbortError" });
    assert.equal(workers[0].terminated, true);
    const completed = processPhoto(file);
    const result = { display: new Blob(), thumbnail: new Blob(), width: 1600, height: 900 };
    workers[1].onmessage({ data: { result } });
    assert.equal(await completed, result);
    assert.equal(workers[1].terminated, true);
  } finally {
    if (originalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = originalWorker;
    if (originalCanvas === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = originalCanvas;
  }
});
