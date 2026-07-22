import { Clock3, PackageCheck } from "lucide-react";
import { moodLabels } from "../../../../constants";
import type { DailyEntry } from "../../../../types";
import { formatReportDate } from "../../../../utils/date";
import { getBonusMoney, getMainIncome, getReceivedMoney, getTotalEntryMoney } from "../../../../utils/entries";
import { formatMoney } from "../../../../utils/money";
import { HistoryRecordMenu } from "../HistoryRecordMenu";

type JournalDayCardProps = {
  entry: DailyEntry;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
};

export function JournalDayCard({ entry, onDelete, onEdit, onView }: JournalDayCardProps) {
  const mainIncome = getMainIncome(entry);
  const extraIncome = getBonusMoney(entry) + getReceivedMoney(entry);
  const preview = [entry.diary, entry.note && entry.note !== entry.diary ? entry.note : ""].filter(Boolean);

  return (
    <article className="journal-day-card">
      <header>
        <div>
          <h3>{formatReportDate(entry.date)}</h3>
          <p><Clock3 aria-hidden="true" size={14} /> {entry.workHours} giờ · <PackageCheck aria-hidden="true" size={14} /> {entry.orderCount ?? 0} đơn</p>
        </div>
        <div className="journal-day-card__total">
          <strong>{formatMoney(getTotalEntryMoney(entry))}</strong>
          <span>{moodLabels[entry.mood]}</span>
        </div>
        <HistoryRecordMenu label={`nhật ký ${formatReportDate(entry.date)}`} onDelete={onDelete} onEdit={onEdit} onView={onView} />
      </header>

      <dl className="journal-day-card__money">
        <div><dt>Tiền làm được</dt><dd>{formatMoney(mainIncome)}</dd></div>
        <div><dt>Thưởng/nhận thêm</dt><dd>{formatMoney(extraIncome)}</dd></div>
        <div><dt>Số giờ làm</dt><dd>{entry.workHours} giờ</dd></div>
        <div><dt>Số đơn</dt><dd>{entry.orderCount ?? 0} đơn</dd></div>
      </dl>

      {preview.length > 0 && <div className="journal-day-card__preview">{preview.map((text, index) => <p key={`${entry.id}-preview-${index}`}>{text}</p>)}</div>}
      <button type="button" className="history-view-action" onClick={onView}>Xem chi tiết</button>
    </article>
  );
}

export function JournalDetails({ entry }: { entry: DailyEntry }) {
  return (
    <div className="history-detail-stack">
      <dl className="history-detail-values">
        <DetailValue label="Tiền làm được" value={formatMoney(getMainIncome(entry))} />
        <DetailValue label="Tiền thưởng" value={formatMoney(getBonusMoney(entry))} />
        <DetailValue label="Tiền nhận được" value={formatMoney(getReceivedMoney(entry))} />
        <DetailValue label="Tổng ngày" value={formatMoney(getTotalEntryMoney(entry))} />
        <DetailValue label="Giờ làm" value={`${entry.workHours} giờ`} />
        <DetailValue label="Số đơn" value={`${entry.orderCount ?? 0} đơn`} />
        <DetailValue label="Tâm trạng" value={moodLabels[entry.mood]} />
      </dl>
      {entry.diary && <DetailText label="Nhật ký" value={entry.diary} />}
      {entry.note && entry.note !== entry.diary && <DetailText label="Ghi chú" value={entry.note} />}
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function DetailText({ label, value }: { label: string; value: string }) {
  return <section className="history-detail-text"><h3>{label}</h3><p>{value}</p></section>;
}
