import type { JarActivity, JarLedger } from "./jarModel.ts";
import { getDateString } from "../../../utils/date.ts";

const labels: Record<JarActivity["kind"], string> = {
  allocate: "Nạp vào hũ", release: "Giải phóng về tài khoản",
  transfer_in: "Nhận từ hũ khác", transfer_out: "Chuyển sang hũ khác",
  spend: "Chi từ hũ", refund: "Hoàn tiền", close: "Đóng hũ",
};

export function getJarActivityGroups(ledger: JarLedger, jarId: string) {
  const transactions = new Map(ledger.transactions.map((item) => [item.id, item]));
  const accounts = new Map(ledger.accounts.map((item) => [item.id, item.name]));
  const jars = new Map(ledger.jars.map((item) => [item.id, item.name]));
  const rows = ledger.jarActivities.filter((activity) => activity.jarId === jarId).map((activity) => {
    const lines = (activity.transactionIds ?? []).flatMap((id) => {
      const transaction = transactions.get(id);
      return transaction?.jarId === jarId && transaction.jarActivityId === activity.id ? [transaction] : [];
    });
    const date = lines[0]?.date ?? getDateString(new Date(activity.createdAt));
    const amount = activity.kind === "spend" || activity.kind === "refund"
      ? (lines.length ? lines.reduce((sum, line) => sum + line.amount, 0) : null)
      : activity.kind === "close" ? null : activity.amount ?? null;
    const sign = activity.kind === "spend" || activity.kind === "release" || activity.kind === "transfer_out"
      ? -1 : 1;
    const source = activity.accountId ? accounts.get(activity.accountId) ?? "Tài khoản đã xóa" : "";
    const lineAccounts = [...new Set(lines.map((line) => accounts.get(line.accountId) ?? "Tài khoản đã xóa"))];
    const counterparty = activity.relatedJarId ? jars.get(activity.relatedJarId) ?? "Hũ đã xóa" : "";
    const context = activity.kind === "transfer_in" ? `Từ ${counterparty} · ${source}`
      : activity.kind === "transfer_out" ? `Đến ${counterparty} · ${source}`
        : activity.kind === "allocate" ? `Từ ${source}`
          : activity.kind === "release" ? `Về ${source}`
            : lineAccounts.length ? lineAccounts.join(" · ") : source;
    const time = lines[0]?.occurredAt ?? activity.createdAt;
    const recordedLater = Boolean(lines.length && !lines[0].occurredAt &&
      getDateString(new Date(activity.createdAt)) !== date);
    return { activity, date, time, recordedLater, amount, sign, label: labels[activity.kind], context,
      category: lines[0]?.category ?? "",
      missingTransaction: Boolean(activity.transactionIds?.length) && lines.length !== activity.transactionIds?.length };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.activity.createdAt.localeCompare(a.activity.createdAt));
  const groups = new Map<string, typeof rows>();
  for (const row of rows) groups.set(row.date, [...(groups.get(row.date) ?? []), row]);
  return [...groups].map(([date, activities]) => ({ date, activities }));
}
