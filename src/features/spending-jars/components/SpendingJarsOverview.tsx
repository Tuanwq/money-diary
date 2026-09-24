import { ChevronRight, Plus } from "lucide-react";
import type { JarView } from "../domain/jarModel.ts";
import { formatMoney } from "../../../utils/money.ts";
import { JarCard } from "./JarCard.tsx";

export function SpendingJarsOverview({ active, closed, accountNames, onCreate, onOpen }: {
  active: JarView[];
  closed: JarView[];
  accountNames: Map<string, string>;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const allocated = active.reduce((sum, view) => sum + view.remainingAmount + view.spentAmount, 0);
  const spent = active.reduce((sum, view) => sum + view.spentAmount, 0);
  const remaining = active.reduce((sum, view) => sum + view.remainingAmount, 0);
  const usedPercent = allocated > 0 ? Math.min(100, Math.max(0, spent / allocated * 100)) : 0;

  return <>
    <section className="jars-summary" aria-label="Tổng quan các hũ">
      <div className="jars-summary-main"><span>Hũ của bạn · Còn khả dụng</span><strong>{formatMoney(remaining)}</strong></div>
      <div className="jars-summary-breakdown"><span>Đã phân bổ<strong>{formatMoney(allocated)}</strong></span><span>Đã tiêu<strong>{formatMoney(spent)}</strong></span></div>
      <div className="jars-summary-progress"><div className="jar-progress" role="progressbar" aria-label="Tỷ lệ tiền đã sử dụng trong các hũ" aria-valuenow={Math.round(usedPercent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${usedPercent}%` }} /></div><small>{formatMoney(spent)} / {formatMoney(allocated)} đã sử dụng</small></div>
    </section>

    <section className="jars-active" aria-labelledby="jars-active-title">
      <div className="jars-section-heading"><div><h2 id="jars-active-title">Hũ đang dùng</h2><p>{active.length} hũ đang hoạt động</p></div></div>
      {active.length === 0 ? <div className="jars-empty"><strong>Chưa có hũ nào</strong><p>Chia tiền theo từng mục đích để biết mình có thể tiêu bao nhiêu mà không ảnh hưởng các khoản khác.</p><button className="jars-primary" onClick={onCreate} type="button"><Plus size={17} /> Tạo hũ đầu tiên</button></div>
        : <div className="jars-grid">{active.map((view) => <JarCard key={view.jar.id} view={view} accountNames={accountNames} onOpen={() => onOpen(view.jar.id)} />)}</div>}
    </section>

    <details className="jars-closed"><summary><span>Hũ đã đóng</span><span className="jars-closed-count">{closed.length}</span></summary>
      {closed.length === 0 ? <p>Chưa có hũ nào đã đóng.</p> : <div className="jars-closed-list">{closed.map((view) => <button key={view.jar.id} onClick={() => onOpen(view.jar.id)} type="button">
        <span><span aria-hidden="true">{view.jar.icon}</span><strong>{view.jar.name}</strong></span><small>Đã sử dụng {formatMoney(view.spentAmount)}</small><ChevronRight aria-hidden="true" size={17} />
      </button>)}</div>}
    </details>
  </>;
}
