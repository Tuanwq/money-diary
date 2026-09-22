import type { JarActivity, JarLedger } from "../domain/jarModel.ts";
import { formatMoney } from "../../../utils/money.ts";

const names: Record<JarActivity["kind"], string> = {
  allocate: "Nạp vào hũ", release: "Giải phóng", transfer_in: "Nhận từ hũ khác",
  transfer_out: "Chuyển sang hũ khác", spend: "Chi tiêu", refund: "Hoàn tiền", close: "Đóng hũ",
};

export function JarActivityList({ ledger, jarId, onEditSpend, onDeleteSpend }: {
  ledger: JarLedger; jarId: string; onEditSpend: (activity: JarActivity) => void;
  onDeleteSpend: (activity: JarActivity) => void;
}) {
  const transactions = new Map(ledger.transactions.map((item) => [item.id, item]));
  const accounts = new Map(ledger.accounts.map((item) => [item.id, item.name]));
  const history = ledger.jarActivities.filter((item) => item.jarId === jarId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <section className="jar-history" aria-label="Lịch sử hũ">
    <h3>Lịch sử hũ</h3>
    {history.length === 0 && <p>Chưa có phân bổ hoặc giao dịch.</p>}
    {history.map((activity) => {
      const lines = (activity.transactionIds ?? []).flatMap((id) => {
        const item = transactions.get(id);
        return item ? [item] : [];
      });
      const amount = activity.kind === "spend" || activity.kind === "refund"
        ? lines.reduce((sum, item) => sum + item.amount, 0) : activity.amount ?? 0;
      return <article key={activity.id} className="jar-history-row">
        <div><strong>{names[activity.kind]}</strong><small>{new Date(activity.createdAt).toLocaleString("vi-VN")}</small></div>
        {amount > 0 && <strong>{formatMoney(amount)}</strong>}
        {activity.accountId && <p>{accounts.get(activity.accountId) ?? "Tài khoản đã xóa"}</p>}
        {lines.map((item) => <p key={item.id}>{accounts.get(item.accountId) ?? "Tài khoản đã xóa"} · {formatMoney(item.amount)}
          {item.category ? ` · ${item.category}` : ""}</p>)}
        {Boolean(activity.transactionIds?.length) && lines.length === 0 && <p>Giao dịch đã xóa; tiền được hoàn về phần phân bổ.</p>}
        {activity.note && <p>{activity.note}</p>}
        {activity.kind === "spend" && lines.length > 0 && <div className="jar-history-actions">
          <button onClick={() => onEditSpend(activity)} type="button">Sửa khoản chi</button>
          <button onClick={() => onDeleteSpend(activity)} type="button">Xóa khoản chi</button>
        </div>}
      </article>;
    })}
  </section>;
}
