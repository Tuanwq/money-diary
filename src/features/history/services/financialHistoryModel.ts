import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { AccountReconciliation } from "../../account-reconciliation/accountReconciliationModel.ts";
import type { JarActivity, SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import type { HubEntry, HubSettings } from "../../../types/hub.ts";
import { buildHubAnalyticsRows } from "../../../utils/hubAnalytics.ts";
import { vietnamFinancialDate } from "../../photo-finance/services/photoFinanceModel.ts";

export type FinancialHistoryKind = "income" | "expense" | "transfer" | "hub" | "reconciliation" | "jar";
export type FinancialHistoryEvent = {
  id: string;
  date: string;
  sortTime: string;
  kind: FinancialHistoryKind;
  title: string;
  detail: string;
  amount?: number;
  transactionId?: string;
  source?: AccountTransaction["source"];
};

export function buildFinancialHistoryEvents(input: {
  transactions: AccountTransaction[];
  accounts: FinancialAccount[];
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
  reconciliations: AccountReconciliation[];
  jars: SpendingJar[];
  jarActivities: JarActivity[];
}): FinancialHistoryEvent[] {
  const accountNames = new Map(input.accounts.map((item) => [item.id, item.name]));
  const jarNames = new Map(input.jars.map((item) => [item.id, item.name]));
  const transactions: FinancialHistoryEvent[] = input.transactions.map((item) => {
    const from = accountNames.get(item.accountId) ?? "Tài khoản đã ẩn";
    const to = accountNames.get(item.toAccountId ?? "") ?? "Tài khoản đã ẩn";
    return {
      id: `transaction:${item.id}`, date: item.date, sortTime: item.occurredAt ?? item.createdAt,
      kind: item.type, title: item.note.trim() || item.category,
      detail: item.type === "transfer" ? `${from} → ${to}`
        : `${item.category} · ${item.type === "income" ? `Vào ${from}` : `Từ ${from}`}`,
      amount: item.amount, transactionId: item.id, source: item.source,
    };
  });
  const hubs: FinancialHistoryEvent[] = buildHubAnalyticsRows(input.hubEntries, input.hubSettings)
    .map((row) => ({
      id: `hub:${row.entry.id}`, date: row.entry.date,
      sortTime: row.entry.createdAt, kind: "hub" as const,
      title: `Ca HUB · ${row.entry.shiftName || row.entry.hubType}`,
      detail: `${row.hours.toLocaleString("vi-VN")} giờ · ${row.orderCount} đơn · Lợi nhuận HUB`,
      amount: row.actualProfit,
    }));
  const reconciliations: FinancialHistoryEvent[] = input.reconciliations.map((item) => ({
    id: `reconciliation:${item.id}`, date: item.date, sortTime: item.createdAt,
    kind: "reconciliation", title: "Kiểm kê tài khoản",
    detail: `${item.lines.length} tài khoản${item.note ? ` · ${item.note}` : ""}`,
  }));
  const jarActivities: FinancialHistoryEvent[] = input.jarActivities
    .filter((item) => item.kind !== "spend" && item.kind !== "refund")
    .map((item) => ({
      id: `jar:${item.id}`, date: vietnamFinancialDate(new Date(item.createdAt)),
      sortTime: item.createdAt, kind: "jar", title: jarNames.get(item.jarId) ?? "Hũ đã xóa",
      detail: ({ allocate: "Phân bổ", release: "Giải phóng", transfer_in: "Chuyển vào hũ",
        transfer_out: "Chuyển khỏi hũ", close: "Đóng hũ" } as Record<string, string>)[item.kind] ?? "Hoạt động hũ",
      amount: item.amount,
    }));
  return [...transactions, ...hubs, ...reconciliations, ...jarActivities]
    .sort((a, b) => b.date.localeCompare(a.date) || b.sortTime.localeCompare(a.sortTime));
}
