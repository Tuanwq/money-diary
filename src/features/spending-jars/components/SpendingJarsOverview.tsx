import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { JarLedger, JarView } from "../domain/jarModel.ts";
import { getJarDetailPresentation, getJarOverviewPresentation } from "../domain/jarPresentation.ts";
import { getToday } from "../../../utils/date.ts";
import { formatMoney } from "../../../utils/money.ts";
import { AvailableAllocationSection } from "./AvailableAllocationSection.tsx";
import { JarCard } from "./JarCard.tsx";

type Filter = "all" | "attention" | "monthly";

export function SpendingJarsOverview({ active, closed, ledger, onCreate, onOpen, onAllocate, onSmartAllocate }: {
  active: JarView[];
  closed: JarView[];
  ledger: JarLedger;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onAllocate: () => void;
  onSmartAllocate: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showAccounts, setShowAccounts] = useState(false);
  const summary = getJarOverviewPresentation(ledger);
  const today = getToday();
  const sorted = active.map((view) => getJarDetailPresentation(ledger, view.jar, today))
    .sort((a, b) => a.priority - b.priority || a.jar.name.localeCompare(b.jar.name, "vi"));
  const visible = sorted.filter((item) => filter === "all" ||
    (filter === "attention" && item.priority <= 2) ||
    (filter === "monthly" && item.period === "monthly"));

  return <>
    <section className="jars-summary" aria-label="Tổng quan các hũ">
      <div className="jars-summary-main"><span>Tiền dành cho các hũ</span>
        <strong>{formatMoney(summary.totalAllocatableAmount)}</strong></div>
      {summary.totalAllocatableAmount > 0 ? <><div className="jars-summary-breakdown">
        <span>Đã chia vào hũ<strong>{formatMoney(summary.allocatedAmount)}</strong></span>
        <button type="button" aria-expanded={showAccounts} onClick={() => setShowAccounts(!showAccounts)}>
          <span>Chưa phân bổ <ChevronDown size={15} aria-hidden="true" /></span>
          <strong>{formatMoney(summary.unallocatedAmount)}</strong>
        </button>
      </div>
      <div className="jars-summary-progress"><div className="jar-progress" role="progressbar"
        aria-label="Tỷ lệ tiền đã chia vào hũ" aria-valuenow={summary.allocationPercent}
        aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${summary.allocationPercent}%` }} /></div>
        <small>Đã chia {summary.allocationPercent}% số tiền đang dành hoặc có thể chia cho hũ.</small></div></>
        : <div className="jars-summary-empty"><p>Chưa có tiền đã chia hoặc tài khoản đủ điều kiện để chia vào hũ.</p>
          <button type="button" aria-expanded={showAccounts} onClick={() => setShowAccounts(!showAccounts)}>
            Xem tình trạng tài khoản <ChevronDown size={15} aria-hidden="true" /></button></div>}
      {summary.position.shortfall > 0 && <p className="jars-summary-warning">Nguồn tài khoản thiếu {formatMoney(summary.position.shortfall)} so với tiền đã dành. Hãy kiểm tra trước khi chia thêm.</p>}
      {summary.position.needsReview > 0 && <p className="jars-summary-warning">{summary.position.needsReview} tài khoản cần xác nhận quyền dùng cho hũ trong Sổ tài khoản.</p>}
      {active.length > 0 && summary.unallocatedAmount > 0 && <div className="jars-summary-actions"><button className="jars-primary" type="button" onClick={onAllocate}>Chia tiền</button>
        <button type="button" onClick={onSmartAllocate}>Chia thông minh</button></div>}
      {showAccounts && <AvailableAllocationSection position={summary.position}
        accounts={ledger.accounts.filter((account) => !account.archivedAt)} />}
    </section>

    <section className="jars-active" aria-labelledby="jars-active-title">
      <div className="jars-section-heading"><div><h2 id="jars-active-title">Hũ đang dùng</h2>
        {active.length > 0 && <p>{active.length} hũ · đã chi từ các hũ đang dùng {formatMoney(summary.spentFromActiveJars)}</p>}</div></div>
      {active.length === 0 ? <div className="jars-empty"><strong>Chưa có hũ nào</strong>
        <p>Tạo hũ đầu tiên để dành tiền cho một mục đích cụ thể.</p>
        <button className="jars-primary" onClick={onCreate} type="button"><Plus size={17} /> Tạo hũ đầu tiên</button></div>
        : <><div className="jars-filters" role="group" aria-label="Lọc hũ">
          {([["all", "Tất cả"], ["attention", "Cần chú ý"], ["monthly", "Theo tháng"]] as const)
            .map(([value, label]) => <button className={filter === value ? "is-active" : ""}
              key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}
        </div>{visible.length ? <div className="jars-grid">{visible.map((item) => <JarCard key={item.jar.id}
          presentation={item} onOpen={() => onOpen(item.jar.id)} />)}</div>
          : <p className="jars-section-empty">Không có hũ trong bộ lọc này.</p>}</>}
    </section>

    <details className="jars-closed"><summary><span>Hũ đã đóng</span><span className="jars-closed-count">{closed.length}</span></summary>
      {closed.length === 0 ? <p>Chưa có hũ nào đã đóng.</p> : <div className="jars-closed-list">{closed.map((view) => <button key={view.jar.id} onClick={() => onOpen(view.jar.id)} type="button">
        <span><span aria-hidden="true">{view.jar.icon}</span><strong>{view.jar.name}</strong></span><small>Đã chi từ hũ {formatMoney(view.spentAmount)}</small><ChevronRight aria-hidden="true" size={17} />
      </button>)}</div>}
    </details>
  </>;
}
