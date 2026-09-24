import { ChevronRight, WalletCards } from "lucide-react";
import { getJarRemainingPercent, type JarView } from "../domain/jarModel.ts";
import { formatMoney } from "../../../utils/money.ts";

export function JarCard({ view, accountNames, onOpen }: {
  view: JarView;
  accountNames: Map<string, string>;
  onOpen: () => void;
}) {
  const percent = getJarRemainingPercent(view);
  const sources = view.sources.filter((item) => item.amount > 0);
  const status = view.remainingAmount <= 0
    ? view.spentAmount > 0 ? "Đã hết" : "Chưa nạp"
    : percent <= 10 ? "Gần hết" : "Đang dùng";
  const tone = status === "Gần hết" ? "is-low" : status === "Đã hết" ? "is-empty" : "is-active";

  return <button className={`jar-card ${tone}`} onClick={onOpen} type="button" aria-label={`Xem hũ ${view.jar.name}, còn ${formatMoney(view.remainingAmount)}`}>
    <span className="jar-card-top">
      <span className="jar-card-identity"><span className="jar-card-icon" aria-hidden="true">{view.jar.icon}</span><span className="jar-card-name">{view.jar.name}</span></span>
      <ChevronRight aria-hidden="true" size={18} />
    </span>
    <span className="jar-card-balance"><span>Còn khả dụng</span><strong>{formatMoney(view.remainingAmount)}</strong></span>
    <span className="jar-card-progress-copy"><span className={`jar-status ${tone}`}>{status}</span><span>Còn {percent}% hạn mức</span></span>
    <span className="jar-progress" role="progressbar" aria-label={`Tiền còn lại trong hũ ${view.jar.name}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></span>
    <span className="jar-card-metrics"><span><small>Đã tiêu</small><strong>{formatMoney(view.spentAmount)}</strong></span><span><small>Hạn mức</small><strong>{formatMoney(view.jar.limitAmount)}</strong></span></span>
    <span className="jar-card-source-block"><span className="jar-card-source-title">Nguồn tiền</span>
      {sources.length === 0 ? <span className="jar-card-source-empty">Chưa có tiền trong hũ</span> : <>
        {sources.slice(0, 2).map((item) => <span className="jar-card-source-row" key={item.accountId}>
          <span><WalletCards aria-hidden="true" size={15} /> {accountNames.get(item.accountId) ?? "Tài khoản đã xóa"}</span>
          <strong>{formatMoney(item.amount)}</strong>
        </span>)}
        {sources.length > 2 && <span className="jar-card-more-sources">+{sources.length - 2} nguồn khác · xem chi tiết</span>}
      </>}
    </span>
    {view.deficitAmount > 0 && <span className="jar-card-deficit">Nguồn đang thiếu {formatMoney(view.deficitAmount)}</span>}
  </button>;
}
