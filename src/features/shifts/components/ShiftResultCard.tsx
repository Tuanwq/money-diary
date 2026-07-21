import { FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { HUB_TYPE_LABEL } from "../../../constants/hanoiHub";
import type { HubEntry } from "../../../types/hub";
import { formatReportDate } from "../../../utils/date";
import type { calculateHubIncome } from "../../../utils/hubIncome";
import { formatMoney } from "../../../utils/money";

type HubIncome = ReturnType<typeof calculateHubIncome>;

type ShiftResultCardProps = {
  durationHours: number;
  entry: HubEntry;
  income: HubIncome;
  isExpanded: boolean;
  onEdit: (entry: HubEntry) => void;
  onRequestDelete: (entry: HubEntry) => void;
  onToggle: (id: string) => void;
};

type IncomeRowProps = {
  label: string;
  tone?: "income" | "expense" | "neutral";
  value: number;
};

function formatHours(hours: number) {
  if (hours <= 0) return null;
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(hours)} giờ`;
}

function getJoinQuantity(join: HubEntry["joins"][number]) {
  return join.quantity ?? join.order ?? 0;
}

function IncomeRow({ label, tone = "neutral", value }: IncomeRowProps) {
  const sign = tone === "income" && value > 0 ? "+" : tone === "expense" && value > 0 ? "−" : "";

  return (
    <div className="shift-income-row">
      <dt>{label}</dt>
      <dd className={`is-${tone}`}>
        {sign}{formatMoney(Math.abs(value))}
      </dd>
    </div>
  );
}

export function ShiftResultCard({
  durationHours,
  entry,
  income,
  isExpanded,
  onEdit,
  onRequestDelete,
  onToggle,
}: ShiftResultCardProps) {
  const detailsId = `shift-details-${entry.id}`;
  const recordedIncome = entry.diaryIncomeAmount ?? income.workIncome;
  const thresholdIncome = income.extraOrderReward + income.extraJoinOrderReward;
  const shiftDuration = formatHours(durationHours);
  const metrics = [
    { label: "Tiền từ đơn", value: income.basePrice, always: true },
    { label: "Vượt mốc", value: thresholdIncome, always: false },
    { label: "Thu nhập khác", value: income.extraIncome, always: false },
    { label: "Ghi vào nhật ký", value: recordedIncome, always: true },
  ].filter((metric) => metric.always || metric.value !== 0);

  return (
    <article className="shift-result-card">
      <header className="shift-result-card__header">
        <div className="shift-result-card__identity">
          <div className="shift-result-card__title-row">
            <h3>{formatReportDate(entry.date)} · {HUB_TYPE_LABEL[entry.hubType]}</h3>
            <span className="shift-order-type">
              {entry.isHubShort ? "Hub ngắn" : "Đơn thường"}
            </span>
          </div>
          <p>
            {entry.shiftName || "Chưa nhập khung giờ"}
            {shiftDuration ? ` · ${shiftDuration}` : ""}
          </p>
        </div>

        <div className="shift-result-card__headline">
          <div>
            <span>Tổng thu nhập ca</span>
            <strong>{formatMoney(income.total)}</strong>
          </div>
          <span className={`shift-performance${entry.isWellDone ? " is-good" : " is-warning"}`}>
            {entry.isWellDone ? "Đạt mục tiêu" : "Chưa đạt"}
          </span>
          <details className="shift-action-menu">
            <summary aria-label={`Mở thao tác cho ca ${formatReportDate(entry.date)} ${HUB_TYPE_LABEL[entry.hubType]}`}>
              <MoreHorizontal aria-hidden="true" size={21} />
            </summary>
            <div className="shift-action-menu__content">
              <button type="button" onClick={() => onEdit(entry)}>
                <Pencil aria-hidden="true" size={16} />
                Chỉnh sửa ca
              </button>
              <button type="button" onClick={() => onToggle(entry.id)}>
                {isExpanded ? "Thu gọn" : "Xem chi tiết"}
              </button>
              <div className="shift-action-menu__divider" />
              <button type="button" className="is-danger" onClick={() => onRequestDelete(entry)}>
                <Trash2 aria-hidden="true" size={16} />
                Xóa ca
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className="shift-result-card__orders">
        <strong>{entry.order} đơn</strong>
        <span>{income.totalJoinChildOrders} đơn ghép · {income.remainingSingleOrders} đơn lẻ</span>
        {entry.note && (
          <span className="shift-note-indicator">
            <FileText aria-hidden="true" size={14} />
            Có ghi chú
          </span>
        )}
      </div>

      <dl className="shift-primary-metrics">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{formatMoney(metric.value)}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        className="shift-details-toggle"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={() => onToggle(entry.id)}
      >
        {isExpanded ? "Thu gọn" : "Xem chi tiết"}
      </button>

      {isExpanded && (
        <div id={detailsId} className="shift-result-card__details">
          <div className="shift-income-groups">
            <section>
              <h4>Đơn hàng</h4>
              <dl>
                <IncomeRow label="Tiền đơn lẻ còn lại" value={income.singleOrderIncome} />
                <IncomeRow label="Tiền từ đơn ghép" value={income.joinOrderIncome} />
              </dl>
            </section>

            <section>
              <h4>Thưởng</h4>
              <dl>
                <IncomeRow label="Vượt mốc đơn" value={income.extraOrderReward} />
                <IncomeRow label="Vượt mốc ghép" value={income.extraJoinOrderReward} />
                <IncomeRow label="Thưởng Chủ nhật" value={income.sundayReward} />
                <IncomeRow label="Thưởng khu vực" value={income.weekdayRegionReward} />
              </dl>
            </section>

            <section>
              <h4>Điều chỉnh và ghi nhận</h4>
              <dl>
                <IncomeRow label="Thu nhập khác" tone="income" value={income.extraIncome} />
                <IncomeRow
                  label={income.joinDifference >= 0 ? "Chênh lệch giá ghép tăng" : "Chênh lệch giá ghép giảm"}
                  tone={income.joinDifference >= 0 ? "income" : "expense"}
                  value={Math.abs(income.joinDifference)}
                />
                <IncomeRow label="Tiền ghi vào nhật ký" value={recordedIncome} />
              </dl>
            </section>
          </div>

          <div className="shift-income-explanation">
            <p><strong>Tổng thu nhập ca:</strong> tiền đơn, các khoản thưởng và thu nhập khác.</p>
            <p><strong>Thu nhập ghi nhận:</strong> số tiền thực tế được cộng vào nhật ký của ngày.</p>
            <p>Chênh lệch giá ghép dùng để so sánh với giá đơn lẻ, không được cộng thêm lần nữa.</p>
          </div>

          {entry.joins.length > 0 && (
            <section className="shift-join-breakdown">
              <h4>Chi tiết ghép</h4>
              <div className="shift-join-breakdown__header" aria-hidden="true">
                <span>Loại</span><span>Số lượt</span><span>Số tiền</span>
              </div>
              <div className="shift-join-breakdown__rows">
                {entry.joins.map((join, index) => {
                  const quantity = getJoinQuantity(join);
                  return (
                    <div key={join.id ?? `${entry.id}-legacy-join-${index}`}>
                      <strong>Ghép {join.type}</strong>
                      <span>{quantity} lượt</span>
                      <span>{formatMoney(quantity * join.price)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {entry.note && (
            <section className="shift-note">
              <h4>Ghi chú</h4>
              <p>{entry.note}</p>
            </section>
          )}

          <div className="shift-result-card__detail-actions">
            <button type="button" className="app-primary-button" onClick={() => onEdit(entry)}>
              <Pencil aria-hidden="true" size={17} />
              Cập nhật ca
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
