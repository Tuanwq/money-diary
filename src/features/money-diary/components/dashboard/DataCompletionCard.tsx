import {
  BadgeCheck,
  BellRing,
  Check,
  Circle,
  CircleAlert,
} from "lucide-react";
import { useState } from "react";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
} from "../../../../types";
import type { DataWarning } from "../../../../utils/dataWarnings";
import { formatReportDate } from "../../../../utils/date";
import {
  useDataCompletion,
  type DataCompletionItemId,
} from "../../hooks/useDataCompletion";
import { DashboardSectionState } from "./DashboardSectionState";

type DataCompletionCardProps = {
  balanceCheck?: BalanceCheckEntry;
  entry?: DailyEntry;
  error?: string | null;
  expense?: ExpenseEntry;
  isLoading?: boolean;
  isSelectedToday: boolean;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onCheckBalance: () => void;
  onEnableNotifications: () => void;
  onOpenHistory: () => void;
  onRetry?: () => void;
  onWarningAction: (warning: DataWarning) => void;
  selectedDate: string;
  warnings: DataWarning[];
};

const actionByItem: Record<
  DataCompletionItemId,
  keyof Pick<
    DataCompletionCardProps,
    "onAddIncome" | "onAddExpense" | "onCheckBalance"
  >
> = {
  income: "onAddIncome",
  expense: "onAddExpense",
  balance: "onCheckBalance",
};

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} và ${labels.at(-1)}`;
}

export function DataCompletionCard(props: DataCompletionCardProps) {
  const {
    balanceCheck,
    entry,
    error,
    expense,
    isLoading,
    isSelectedToday,
    onEnableNotifications,
    onOpenHistory,
    onRetry,
    onWarningAction,
    selectedDate,
    warnings,
  } = props;
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const completion = useDataCompletion({
    balanceCheck,
    entry,
    expense,
    selectedDate,
    warnings,
  });
  const completedLabels = completion.items
    .filter((item) => item.done)
    .map((item) => item.label.toLocaleLowerCase("vi-VN"));
  const missingLabels = completion.missingItems.map((item) =>
    item.label.toLocaleLowerCase("vi-VN")
  );
  const primaryItem = completion.primaryMissingItem;
  const primaryAction = primaryItem
    ? props[actionByItem[primaryItem.id]]
    : undefined;
  const title = isSelectedToday ? "Dữ liệu hôm nay" : "Dữ liệu ngày đã chọn";
  const description = completion.isComplete
    ? "Thu nhập, chi tiêu và kiểm kê đã được cập nhật."
    : `${
        completedLabels.length > 0
          ? `Đã có ${joinLabels(completedLabels)}. `
          : ""
      }Chưa có ${joinLabels(missingLabels)} cho ngày đang xem.`;
  const isPending = Boolean(isLoading || error);

  return (
    <section
      className={`money-card money-data-completion ${
        completion.isComplete ? "is-complete" : "is-incomplete"
      }`}
      aria-labelledby="money-data-completion-title"
    >
      <div className="money-data-completion-main">
        <span className="money-data-completion-icon" aria-hidden="true">
          {completion.isComplete ? <BadgeCheck size={22} /> : <CircleAlert size={22} />}
        </span>

        <div className="money-data-completion-copy">
          <div className="money-data-completion-title-row">
            <div>
              <h2 id="money-data-completion-title">
                {isPending ? "Tình trạng dữ liệu" : title}
              </h2>
              <p>
                {isSelectedToday ? "Hôm nay" : formatReportDate(selectedDate)}
              </p>
            </div>
            {!isPending && <strong>{completion.doneCount}/3</strong>}
          </div>
          {!isPending && (
            <p className="money-data-completion-description">{description}</p>
          )}
        </div>
      </div>

      {isLoading || error ? (
        <DashboardSectionState
          error={error}
          isLoading={isLoading}
          onRetry={onRetry}
          variant="compact"
        />
      ) : (
        <>
          <div className="money-data-completion-actions">
            {primaryItem && primaryAction && (
              <button
                type="button"
                className="money-primary-action"
                onClick={primaryAction}
              >
                {primaryItem.actionLabel}
              </button>
            )}
            {!primaryItem && (
              <button
                type="button"
                className="money-text-action"
                onClick={onOpenHistory}
              >
                Xem nhật ký
              </button>
            )}
            <button
              type="button"
              className="money-secondary-action"
              aria-expanded={isDetailOpen}
              aria-controls="money-data-completion-details"
              onClick={() => setIsDetailOpen((current) => !current)}
            >
              {isDetailOpen ? "Thu gọn" : "Xem chi tiết"}
            </button>
          </div>

          {isDetailOpen && (
            <div id="money-data-completion-details" className="money-data-completion-details">
              <div className="money-data-completion-status-list">
                {completion.items.map((item) => (
                  <div key={item.id} className="money-data-completion-status-row">
                    <span>
                      {item.done ? (
                        <Check aria-hidden="true" size={16} />
                      ) : (
                        <Circle aria-hidden="true" size={14} />
                      )}
                      {item.label}
                    </span>
                    <strong className={item.done ? "is-done" : ""}>
                      {item.done ? "Đã nhập" : "Còn thiếu"}
                    </strong>
                  </div>
                ))}
              </div>

              {completion.detailWarnings.length > 0 && (
                <div className="money-data-completion-warning-list">
                  {completion.detailWarnings.map((warning) => (
                    <article key={warning.id}>
                      <div>
                        <strong>{warning.title}</strong>
                        <p>{warning.description}</p>
                      </div>
                      <button type="button" onClick={() => onWarningAction(warning)}>
                        {warning.actionLabel}
                      </button>
                    </article>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="money-data-completion-notification"
                onClick={onEnableNotifications}
              >
                <BellRing aria-hidden="true" size={17} />
                Bật nhắc cuối ngày
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
