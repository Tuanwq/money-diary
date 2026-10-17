import { ChevronRight, Plus } from "lucide-react";
import { getJarBudgetView, type JarLedger, type JarView } from "../domain/jarModel.ts";
import { getFinancialPosition } from "../domain/financialPosition.ts";
import { getToday } from "../../../utils/date.ts";
import { formatMoney } from "../../../utils/money.ts";
import { JarCard } from "./JarCard.tsx";

export function SpendingJarsOverview({ active, closed, accountNames, ledger, position, onCreate, onOpen }: {
  active: JarView[];
  closed: JarView[];
  accountNames: Map<string, string>;
  ledger: JarLedger;
  position: ReturnType<typeof getFinancialPosition>;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const reserved = position.reserved;
  const spent = active.reduce((sum, view) => sum + view.spentAmount, 0);
  const netFunded = reserved + spent;
  const usedPercent = netFunded > 0 ? Math.min(100, Math.max(0, spent / netFunded * 100)) : 0;

  return <>
    <section className="jars-summary" aria-label="Tổng quan các hũ">
      <div className="jars-summary-main"><span>Tiền thực đang dành trong hũ</span><strong>{formatMoney(reserved)}</strong></div>
      <div className="jars-summary-breakdown"><span>Có thể phân bổ thêm<strong>{formatMoney(position.allocationCapacity)}</strong></span><span>Đã chi từ hũ · lũy kế<strong>{formatMoney(spent)}</strong></span></div>
      <div className="jars-summary-progress"><div className="jar-progress" role="progressbar" aria-label="Tỷ lệ tiền đã dành ròng được sử dụng" aria-valuenow={Math.round(usedPercent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${usedPercent}%` }} /></div><small>{formatMoney(spent)} / {formatMoney(netFunded)} tiền đã dành ròng</small></div>
      {position.needsReview > 0 && <p>{position.needsReview} tài khoản cũ cần chọn có thể dùng cho hũ trong Sổ tài khoản.</p>}
    </section>

    <section className="jars-active" aria-labelledby="jars-active-title">
      <div className="jars-section-heading"><div><h2 id="jars-active-title">Hũ đang dùng</h2><p>{active.length} hũ đang hoạt động</p></div></div>
      {active.length === 0 ? <div className="jars-empty"><strong>Chưa có hũ nào</strong><p>Chia tiền theo từng mục đích để biết mình có thể tiêu bao nhiêu mà không ảnh hưởng các khoản khác.</p><button className="jars-primary" onClick={onCreate} type="button"><Plus size={17} /> Tạo hũ đầu tiên</button></div>
        : <div className="jars-grid">{active.map((view) => <JarCard key={view.jar.id} view={view}
          budget={getJarBudgetView(ledger, view.jar, getToday())} accountNames={accountNames}
          onOpen={() => onOpen(view.jar.id)} />)}</div>}
    </section>

    <details className="jars-closed"><summary><span>Hũ đã đóng</span><span className="jars-closed-count">{closed.length}</span></summary>
      {closed.length === 0 ? <p>Chưa có hũ nào đã đóng.</p> : <div className="jars-closed-list">{closed.map((view) => <button key={view.jar.id} onClick={() => onOpen(view.jar.id)} type="button">
        <span><span aria-hidden="true">{view.jar.icon}</span><strong>{view.jar.name}</strong></span><small>Đã sử dụng {formatMoney(view.spentAmount)}</small><ChevronRight aria-hidden="true" size={17} />
      </button>)}</div>}
    </details>
  </>;
}
