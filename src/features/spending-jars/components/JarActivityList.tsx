import { useState } from "react";
import type { JarActivity, JarLedger } from "../domain/jarModel.ts";
import { getJarActivityGroups } from "../domain/jarActivityPresentation.ts";
import { getToday, toDate } from "../../../utils/date.ts";
import { formatMoney } from "../../../utils/money.ts";
import { paginateItems } from "../../../utils/pagination.ts";
import { HistoryPagination } from "../../history/components/HistoryPagination.tsx";

const PAGE_SIZE = 8;

export function JarActivityList({ ledger, jarId, onEditSpend, onDeleteSpend }: {
  ledger: JarLedger; jarId: string; onEditSpend: (activity: JarActivity) => void;
  onDeleteSpend: (activity: JarActivity) => void;
}) {
  const [page, setPage] = useState(1);
  const groups = getJarActivityGroups(ledger, jarId);
  const rows = groups.flatMap((group) => group.activities.map((row) => ({ date: group.date, row })));
  const { items: pageRows, currentPage, totalPages } = paginateItems(rows, page, PAGE_SIZE);
  const pageGroups = pageRows.reduce<typeof groups>((result, { date, row }) => {
    const last = result[result.length - 1];
    if (last?.date === date) last.activities.push(row);
    else result.push({ date, activities: [row] });
    return result;
  }, []);
  const today = getToday();
  return <section className="jar-history" aria-label="Lịch sử hũ">
    <h2>Lịch sử hũ{rows.length > 0 ? ` · ${rows.length} hoạt động` : ""}</h2>
    {groups.length === 0 && <p>Chưa có hoạt động nào. Nạp tiền hoặc ghi một khoản chi để bắt đầu.</p>}
    {pageGroups.map((group) => <div className="jar-history-group" key={group.date}>
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
    <HistoryPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
  </section>;
}
