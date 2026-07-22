import {
  ArrowRight,
  Banknote,
  Calculator,
  CalendarDays,
  CircleHelp,
  RefreshCcw,
  WalletCards,
} from "lucide-react";
import type { HubEntry, HubSettings } from "../../../../types/hub";
import { calculateHubIncome } from "../../../../utils/hubIncome";
import { formatMoney } from "../../../../utils/money";
import { HUB_TYPE_LABEL } from "../../../../constants/hanoiHub";
import { HubEmptyState, HubMetricStrip, HubTabHeader } from "../shared";
import type { HubCalculatorForm, HubCalculatorTotals } from "../work/types";

type CalculatorRow = {
  entry: HubEntry;
  income: ReturnType<typeof calculateHubIncome>;
};

type CalculatorPageProps = {
  form: HubCalculatorForm;
  totals: HubCalculatorTotals;
  rows: CalculatorRow[];
  settings: HubSettings;
  onDateChange: (value: string) => void;
  onNegativeWalletChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onApplyToNewShift: () => void;
  onReset: () => void;
};

type ResultRowProps = {
  label: string;
  value: number;
  operation?: "+" | "−";
  muted?: boolean;
};

function ResultRow({ label, value, operation, muted }: ResultRowProps) {
  return (
    <div className={`hub-calculator-result__row${muted ? " is-muted" : ""}`}>
      <dt>{label}</dt>
      <dd>
        {operation && <span aria-hidden="true">{operation}</span>}
        {formatMoney(Math.abs(value))}
      </dd>
    </div>
  );
}

export function CalculatorPage({
  form,
  totals,
  rows,
  settings,
  onDateChange,
  onNegativeWalletChange,
  onTargetChange,
  onApplyToNewShift,
  onReset,
}: CalculatorPageProps) {
  const hasSavedShift = rows.length > 0;
  const resultTone = totals.remainingToTarget > 0 ? "warning" : "income";

  function focusResult() {
    document.getElementById("hub-calculator-result")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <section className="hub-feature-page hub-calculator-page">
      <HubTabHeader
        icon={Calculator}
        title="Máy tính"
        description="Đối chiếu thu nhập Hub đã lưu với tiền âm ví app và mốc cần về."
      />

      <div className="hub-calculator-layout">
        <div className="hub-calculator-layout__inputs">
          <section className="hub-feature-section">
            <div className="hub-feature-section__heading">
              <CalendarDays size={19} aria-hidden="true" />
              <div>
                <h3>Dữ liệu tính mốc</h3>
                <p>Chọn ngày đã có ca, sau đó nhập số dư âm và mốc muốn đạt.</p>
              </div>
            </div>

            <div className="hub-form-grid">
              <label className="hub-field">
                <span>Ngày tính</span>
                <input type="date" value={form.date} onChange={(event) => onDateChange(event.target.value)} />
              </label>
              <div className="hub-form-grid hub-form-grid--two">
                <label className="hub-field">
                  <span>Tiền âm ví app</span>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.negativeWallet}
                    placeholder="VD: -200.000"
                    onChange={(event) => onNegativeWalletChange(event.target.value)}
                  />
                  <small>Có thể nhập dấu trừ ở đầu số tiền.</small>
                </label>
                <label className="hub-field">
                  <span>Mốc cần về</span>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.target}
                    placeholder="VD: -1.000.000"
                    onChange={(event) => onTargetChange(event.target.value)}
                  />
                  <small>Mốc có thể là số âm hoặc số dương.</small>
                </label>
              </div>
            </div>
          </section>

          <section className="hub-feature-section">
            <div className="hub-feature-section__heading">
              <Banknote size={19} aria-hidden="true" />
              <div>
                <h3>Ca Hub trong ngày</h3>
                <p>Dữ liệu nguồn được lấy trực tiếp từ các ca đã lưu.</p>
              </div>
            </div>

            {rows.length === 0 ? (
              <HubEmptyState
                title="Chưa có ca Hub trong ngày"
                description="Hãy chọn ngày khác hoặc mở form thêm ca mới cho ngày này."
              />
            ) : (
              <div className="hub-calculator-shifts">
                {rows.map(({ entry, income }) => (
                  <article key={entry.id}>
                    <div>
                      <h4>{HUB_TYPE_LABEL[entry.hubType]} · {entry.shiftName}</h4>
                      <p>{entry.order} đơn · {income.totalJoinChildOrders} đơn ghép</p>
                    </div>
                    <strong>{formatMoney(income.total)}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="hub-feature-section hub-calculator-rules">
            <div className="hub-feature-section__heading">
              <CircleHelp size={19} aria-hidden="true" />
              <div>
                <h3>Phạm vi tính</h3>
                <p>Các khoản tách riêng vẫn giữ đúng công thức Máy tính hiện tại.</p>
              </div>
            </div>
            <p>
              Giá đơn thường đang áp dụng: <strong>{formatMoney(settings.orderPrice)}</strong>.
              Thu nhập khác, thưởng ghép vượt mốc, thưởng Chủ nhật và thưởng khu vực được loại khỏi thu nhập tính mốc.
            </p>
          </section>
        </div>

        <aside className="hub-calculator-layout__result" id="hub-calculator-result">
          <section className="hub-feature-section hub-calculator-result">
            <div className="hub-feature-section__heading">
              <WalletCards size={19} aria-hidden="true" />
              <div>
                <h3>Kết quả tạm tính</h3>
                <p>{hasSavedShift ? `${rows.length} ca được dùng để tính.` : "Đang chờ dữ liệu ca trong ngày."}</p>
              </div>
            </div>

            <dl className="hub-calculator-result__breakdown">
              <ResultRow label="Tổng thu nhập Hub" value={totals.totalIncome} operation="+" />
              <ResultRow label="Thu nhập khác" value={totals.excludedExtraIncome} operation="−" muted />
              <ResultRow label="Ghép vượt mốc" value={totals.excludedJoinReward} operation="−" muted />
              <ResultRow label="Thưởng Chủ nhật" value={totals.excludedSundayReward} operation="−" muted />
              <ResultRow label="Thưởng khu vực" value={totals.excludedRegionReward} operation="−" muted />
              <ResultRow label="Tiền âm ví app" value={totals.walletDebt} operation="−" />
            </dl>

            <div className="hub-calculator-result__total">
              <span>Sau khi trừ ví âm</span>
              <strong>{formatMoney(totals.afterWalletDebt)}</strong>
            </div>

            <HubMetricStrip
              ariaLabel="Kết quả so với mốc"
              items={[
                { label: "Mốc cần về", value: formatMoney(totals.target), icon: WalletCards },
                {
                  label: totals.remainingToTarget > 0 ? "Còn thiếu" : "Đã vượt mốc",
                  value: formatMoney(totals.remainingToTarget || totals.overTarget),
                  icon: ArrowRight,
                  tone: resultTone,
                },
              ]}
            />

            <div className="hub-calculator-result__actions">
              <button type="button" className="hub-primary-action" onClick={onApplyToNewShift}>
                Áp dụng vào ca mới
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="hub-secondary-action" onClick={onReset}>
                <RefreshCcw size={16} aria-hidden="true" />
                Đặt lại
              </button>
            </div>
          </section>
        </aside>
      </div>

      <button type="button" className="hub-calculator-mobile-summary" onClick={focusResult}>
        <span>Tạm tính</span>
        <strong>{formatMoney(totals.afterWalletDebt)}</strong>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </section>
  );
}
