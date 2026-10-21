import type { JarActivity, JarLedger } from "../domain/jarModel.ts";
import { getJarActivityGroups } from "../domain/jarActivityPresentation.ts";
import { getToday, toDate } from "../../../utils/date.ts";
import { formatMoney } from "../../../utils/money.ts";

export function JarActivityList({ ledger, jarId, onEditSpend, onDeleteSpend }: {
  ledger: JarLedger; jarId: string; onEditSpend: (activity: JarActivity) => void;
  onDeleteSpend: (activity: JarActivity) => void;
}) {
  const groups = getJarActivityGroups(ledger, jarId);
  const today = getToday();
  return <section className="jar-history" aria-label="Lịch sử hũ">
    <h2>Lịch sử hũ</h2>
    {groups.length === 0 && <p>Chưa có hoạt động nào. Nạp tiền hoặc ghi một khoản chi để bắt đầu.</p>}
    {groups.map((group) => <div className="jar-history-group" key={group.date}>
      <h3>{group.date === today ? "Hôm nay" : new Intl.DateTimeFormat("vi-VN", {
        day: "numeric", month: "long", year: "numeric",
      }).format(toDate(group.date))}</h3>
      {group.activities.map((row) => <article className="jar-history-row" key={row.activity.id}>
        <div className="jar-history-main"><strong>{row.label}{row.category ? ` · ${row.category}` : ""}</strong>
          <small>{row.context || "Hoạt động trong hũ"} · {row.recordedLater ? "Ghi lúc " : ""}{new Date(row.time).toLocaleTimeString("vi-VN", {
            hour: "2-digit", minute: "2-digit",
          })}</small></div>
        {row.amount !== null && <strong className={row.sign < 0 ? "is-outflow" : "is-inflow"}>
          {row.sign < 0 ? "−" : "+"}{formatMoney(row.amount)}</strong>}
        {row.activity.note && <p>{row.activity.note}</p>}
        {row.missingTransaction && <p>Giao dịch liên kết đã bị xóa; cần kiểm tra lại lịch sử tài khoản.</p>}
        {row.activity.kind === "spend" && row.amount !== null && <div className="jar-history-actions">
          <button onClick={() => onEditSpend(row.activity)} type="button">Sửa khoản chi</button>
          <button onClick={() => onDeleteSpend(row.activity)} type="button">Xóa khoản chi</button>
        </div>}
      </article>)}
    </div>)}
  </section>;
}
