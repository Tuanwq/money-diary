import { useState } from "react";
import { ArrowLeft, ArrowRight, Camera, CookingPot, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import type { DailyFinancialSummary } from "../../../photo-finance/types/photoFinance.ts";
import type { getFinancialPosition } from "../../../spending-jars/domain/financialPosition.ts";
import type { buildDashboardJarFlow } from "../../utils/managerDashboardSelectors.ts";
import { readDashboardTab, rememberDashboardTab } from "../../utils/dashboardTabPreference.ts";
import { formatMoney } from "../../../../utils/money.ts";
import type { DashboardTab } from "../../utils/dashboardTabPreference.ts";

function signedMoney(amount: number) {
  if (amount === 0) return formatMoney(0);
  return `${amount >= 0 ? "+" : "−"}${formatMoney(Math.abs(amount))}`;
}

export function FinancialDashboard({
  actualMoney,
  day,
  flow,
  financialPosition,
  onOpenAccounts,
  onOpenJars,
  onOpenJournal,
  spendableMoney,
}: {
  actualMoney: number;
  day: DailyFinancialSummary;
  flow: ReturnType<typeof buildDashboardJarFlow>;
  financialPosition: ReturnType<typeof getFinancialPosition>;
  onOpenAccounts: () => void;
  onOpenJars: () => void;
  onOpenJournal: () => void;
  spendableMoney: number;
}) {
  const [tab, setTab] = useState<DashboardTab>(readDashboardTab);
  const unallocated = spendableMoney - financialPosition.reserved;
  const allocatedPercent = spendableMoney > 0
    ? Math.min(100, Math.round(financialPosition.reserved / spendableMoney * 100))
    : 0;

  function selectTab(next: DashboardTab) {
    setTab(next);
    rememberDashboardTab(next);
  }

  return (
    <section className="manager-balance-card manager-financial-dashboard" aria-labelledby="manager-balance-title">
      <div className="manager-balance-heading">
        <span><WalletCards aria-hidden="true" size={17} /> Tổng tiền hiện có (có thể dùng ngay)</span>
        <button type="button" onClick={onOpenAccounts}>Xem tài khoản <ArrowRight size={16} /></button>
      </div>
      <strong id="manager-balance-title">{formatMoney(spendableMoney)}</strong>
      <p>Trên tổng số dư {formatMoney(actualMoney)} trong Sổ tài khoản.</p>

      <div className="manager-dashboard-tabs" role="tablist" aria-label="Chế độ Dashboard tài chính" data-horizontal-gesture>
        <button id="manager-tab-overview" type="button" role="tab" aria-selected={tab === "overview"}
          aria-controls="manager-panel-overview" className={tab === "overview" ? "is-active" : ""}
          onClick={() => selectTab("overview")}>Tổng quan</button>
        <button id="manager-tab-allocation" type="button" role="tab" aria-selected={tab === "allocation"}
          aria-controls="manager-panel-allocation" className={tab === "allocation" ? "is-active" : ""}
          onClick={() => selectTab("allocation")}>Phân bổ & dòng tiền</button>
      </div>

      {tab === "overview" ? (
        <div id="manager-panel-overview" role="tabpanel" aria-labelledby="manager-tab-overview">
          <div className="manager-day-strip" aria-label="Biến động ngày đang xem">
            <div><span>Thu trong ngày</span><strong className="is-positive">{signedMoney(day.income)}</strong></div>
            <div><span>Chi trong ngày</span><strong className={day.expense < 0 ? "is-positive" : "is-negative"}>
              {signedMoney(-day.expense)}</strong></div>
            <div><span>Thay đổi ròng</span><strong className={day.net < 0 ? "is-negative" : "is-positive"}>
              {signedMoney(day.net)}</strong></div>
          </div>
          <button className="manager-journal-entry" onClick={onOpenJournal} type="button">
            <span><Camera aria-hidden="true" size={20} /><span><strong>Mở Nhật ký tài chính</strong>
              <small>Chụp ảnh và lưu câu chuyện của khoản tiền</small></span></span>
            <span className="manager-journal-swipe"><ArrowLeft size={15} /> Vuốt sang trái</span>
          </button>
        </div>
      ) : (
        <div id="manager-panel-allocation" role="tabpanel" aria-labelledby="manager-tab-allocation" className="manager-allocation-panel">
          <div className="manager-allocation-grid">
            <div className="manager-allocation-stat is-reserved">
              <span><CookingPot aria-hidden="true" size={16} /> Đã phân bổ vào hũ</span>
              <strong>{formatMoney(financialPosition.reserved)}</strong>
            </div>
            <div className="manager-allocation-stat is-unallocated">
              <span><WalletCards aria-hidden="true" size={16} /> Chưa chia hũ</span>
              <strong className={unallocated < 0 ? "is-negative" : ""}>{formatMoney(unallocated)}</strong>
            </div>
          </div>
          <div className="manager-allocation-progress-copy"><span>Tỷ lệ đã phân bổ</span><strong>{allocatedPercent}%</strong></div>
          <div className="manager-allocation-bar" role="progressbar" aria-label="Tỷ lệ tiền thực có đã dành trong hũ"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={allocatedPercent}>
            <span style={{ width: `${allocatedPercent}%` }} />
          </div>
          <p className="manager-allocation-note">Tiền chưa chia hũ chưa trừ các khoản cam kết chưa được ghi nhận.</p>
          <div className="manager-allocation-flow" aria-label="Dòng tiền và hoạt động hũ trong ngày">
            <div className="manager-flow-stat is-income">
              <span><TrendingUp aria-hidden="true" size={16} /> Thu chưa gắn hũ</span>
              <strong className="is-positive">{signedMoney(flow.incomeNotLinkedToJar)}</strong>
            </div>
            <div className="manager-flow-stat is-expense">
              <span><TrendingDown aria-hidden="true" size={16} /> Chi ngoài hũ</span>
              <strong className={flow.expenseOutsideJar < 0 ? "is-positive" : "is-negative"}>{signedMoney(-flow.expenseOutsideJar)}</strong>
            </div>
            <div className="manager-flow-stat is-jar-spend">
              <span><CookingPot aria-hidden="true" size={16} /> Chi từ hũ</span>
              <strong className={flow.expenseFromJar < 0 ? "is-positive" : "is-negative"}>{signedMoney(-flow.expenseFromJar)}</strong>
            </div>
            <div className="manager-flow-stat is-jar-move">
              <span><ArrowRight aria-hidden="true" size={16} /> Chuyển vào hũ</span>
              <strong>{formatMoney(flow.allocatedToJar)}</strong>
            </div>
          </div>
          {(financialPosition.shortfall > 0 || financialPosition.needsReview > 0) && <p className="manager-allocation-warning">
            {financialPosition.shortfall > 0 && `Tiền đã dành vượt tiền thực có ${formatMoney(financialPosition.shortfall)}. `}
            {financialPosition.needsReview > 0 && `${financialPosition.needsReview} tài khoản cần xác nhận quyền dùng cho hũ.`}
          </p>}
          <details className="manager-allocation-more">
            <summary>Xem thêm dòng tiền hũ</summary>
            <div><span>Thu gắn trực tiếp với hũ</span><strong>{formatMoney(flow.incomeLinkedToJar)}</strong></div>
            <div><span>Rút khỏi hũ</span><strong>{formatMoney(flow.releasedFromJar)}</strong></div>
            <div><span>Chuyển giữa các hũ</span><strong>{formatMoney(flow.transferredBetweenJars)}</strong></div>
            <div><span>Có thể nạp thêm vào hũ</span><strong>{formatMoney(financialPosition.allocationCapacity)}</strong></div>
            <p>Chưa có liên kết giữa khoản thu và lần chia hũ; tiền chuyển vào hũ không được tính là thu nhập mới.</p>
          </details>
          <button className="manager-jars-shortcut" type="button" onClick={onOpenJars}>
            <span className="manager-jars-shortcut-icon"><CookingPot aria-hidden="true" size={20} /></span>
            <span className="manager-jars-shortcut-copy"><strong>Hũ chi tiêu</strong>
              <small>Dành tiền cho các khoản sắp chi · vuốt sang phải</small></span>
            <ArrowRight className="manager-jars-shortcut-arrow" aria-hidden="true" size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
