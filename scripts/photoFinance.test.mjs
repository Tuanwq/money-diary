import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyFinancialSummaries, formatCalendarNet, getCalendarDates,
  getCalendarPhotoStack, getDailyFinancialSummary, groupPhotoAttachmentsByDay,
  vietnamFinancialDate, vietnamOccurredAt,
} from "../src/features/photo-finance/services/photoFinanceModel.ts";

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
