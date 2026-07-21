import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CalendarRange,
  ChevronUp,
  Clock3,
  Route,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DailyEntry, Goals } from "../../../../types";
import { getProgress } from "../../../../utils/goals";
import { formatMoney } from "../../../../utils/money";
import { formatWorkDuration } from "../../utils/formatWorkDuration";
import { CompactProgressItem } from "./CompactProgressItem";
import { DashboardSectionState } from "./DashboardSectionState";
import { TodayIncomeBreakdown } from "./TodayIncomeBreakdown";

type IncomeProgressSectionProps = {
  actualMoney: number;
  error?: string | null;
  goals: Goals;
  isLoading?: boolean;
  isSelectedToday: boolean;
  monthIncome: number;
  selectedActualIncome: number;
  selectedBonusMoney: number;
  selectedEntry?: DailyEntry;
  selectedExpenseTotal: number;
  selectedHours: number;
  selectedMainIncome: number;
  selectedReceivedMoney: number;
  totalJourneyMoney: number;
  onRetry?: () => void;
  weekIncome: number;
};

type IncomeMetric = {
  detail?: string;
  emptyMessage?: string;
  icon: LucideIcon;
  id: string;
  label: string;
  progress: number;
  scope: string;
  target: string;
  value: string;
};

export function IncomeProgressSection({
  actualMoney,
  error,
  goals,
  isLoading,
  isSelectedToday,
  monthIncome,
  selectedActualIncome,
  selectedBonusMoney,
  selectedEntry,
  selectedExpenseTotal,
  selectedHours,
  selectedMainIncome,
  selectedReceivedMoney,
  totalJourneyMoney,
  onRetry,
  weekIncome,
}: IncomeProgressSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metrics: IncomeMetric[] = [
    {
      detail: `Làm ${formatMoney(selectedMainIncome)} · Thưởng ${formatMoney(
        selectedBonusMoney
      )} · Chi ${formatMoney(selectedExpenseTotal)} · Nhận ${formatMoney(
        selectedReceivedMoney
      )}`,
      emptyMessage: selectedEntry ? undefined : "Chưa có thu nhập ngày này",
      icon: Banknote,
      id: "day-income",
      label: isSelectedToday ? "Tiền thực tế hôm nay" : "Tiền thực tế ngày này",
      progress: getProgress(selectedActualIncome, goals.dailyIncome),
      scope: "Theo ngày đang chọn.",
      target:
        goals.dailyIncome > 0
          ? `Mục tiêu: ${formatMoney(goals.dailyIncome)}`
          : "Chưa đặt mục tiêu ngày",
      value: formatMoney(selectedActualIncome),
    },
    {
      emptyMessage: selectedEntry?.workHours ? undefined : "Chưa có giờ làm ngày này",
      icon: Clock3,
      id: "day-hours",
      label: isSelectedToday ? "Giờ làm hôm nay" : "Giờ làm ngày này",
      progress: getProgress(selectedHours, goals.dailyHours),
      scope: "Theo ngày đang chọn.",
      target:
        goals.dailyHours > 0
          ? `Mục tiêu: ${formatWorkDuration(goals.dailyHours)}`
          : "Chưa đặt mục tiêu giờ",
      value: formatWorkDuration(selectedHours),
    },
    {
      emptyMessage: weekIncome > 0 ? undefined : "Chưa có thu nhập trong tuần",
      icon: CalendarDays,
      id: "week-income",
      label: isSelectedToday ? "Tiền tuần này" : "Tiền tuần đang xem",
      progress: getProgress(weekIncome, goals.weeklyIncome),
      scope: "Theo tuần chứa ngày đang chọn.",
      target:
        goals.weeklyIncome > 0
          ? `Mục tiêu: ${formatMoney(goals.weeklyIncome)}`
          : "Chưa đặt mục tiêu tuần",
      value: formatMoney(weekIncome),
    },
    {
      emptyMessage: monthIncome > 0 ? undefined : "Chưa có thu nhập trong tháng",
      icon: CalendarRange,
      id: "month-income",
      label: isSelectedToday ? "Tiền tháng này" : "Tiền tháng đang xem",
      progress: getProgress(monthIncome, goals.monthlyIncome),
      scope: "Theo tháng chứa ngày đang chọn.",
      target:
        goals.monthlyIncome > 0
          ? `Mục tiêu: ${formatMoney(goals.monthlyIncome)}`
          : "Chưa đặt mục tiêu tháng",
      value: formatMoney(monthIncome),
    },
    {
      icon: WalletCards,
      id: "current-balance",
      label: "Số dư hiện tại",
      progress: getProgress(actualMoney, goals.bigGoalTarget),
      scope: "Số liệu tích lũy theo logic hiện có.",
      target:
        goals.bigGoalTarget > 0
          ? `Mục tiêu: ${formatMoney(goals.bigGoalTarget)}`
          : "Chưa đặt mục tiêu tổng",
      value: formatMoney(actualMoney),
    },
    {
      icon: Route,
      id: "journey-income",
      label: "Tổng tiền hành trình",
      progress: getProgress(totalJourneyMoney, goals.bigGoalTarget),
      scope: "Toàn bộ hành trình mục tiêu.",
      target:
        goals.bigGoalTarget > 0
          ? `Mục tiêu: ${formatMoney(goals.bigGoalTarget)}`
          : "Chưa đặt mục tiêu tổng",
      value: formatMoney(totalJourneyMoney),
    },
  ];

  return (
    <section className="money-income-progress-section" aria-labelledby="income-progress-title">
      <div className="money-section-heading money-section-heading-inline">
        <div>
          <h2 id="income-progress-title">Thu nhập và tiến độ</h2>
          <p>Số liệu theo ngày đang xem và phạm vi tích lũy tương ứng.</p>
        </div>
        {!isLoading && !error && (
          <button
            type="button"
            className="money-text-action money-income-progress-toggle"
            aria-expanded={isExpanded}
            aria-controls="money-income-progress-details"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? "Thu gọn" : "Xem chi tiết"}
            {isExpanded ? (
              <ChevronUp aria-hidden="true" size={16} />
            ) : (
              <ArrowRight aria-hidden="true" size={16} />
            )}
          </button>
        )}
      </div>

      {isLoading || error ? (
        <DashboardSectionState
          error={error}
          isLoading={isLoading}
          onRetry={onRetry}
          variant="metrics"
        />
      ) : (
        <>
          <div className="money-income-progress-grid">
            {metrics.map((metric) => (
              <CompactProgressItem
                key={metric.id}
                detail={metric.detail}
                emptyMessage={metric.emptyMessage}
                icon={metric.icon}
                id={metric.id}
                label={metric.label}
                progress={metric.progress}
                scope={metric.scope}
                target={metric.target}
                value={metric.value}
              />
            ))}
          </div>

          {isExpanded && (
            <div id="money-income-progress-details" className="money-income-progress-expanded">
              <div className="money-income-progress-breakdown-panel">
                <strong>Chi tiết tiền ngày đang xem</strong>
                {selectedEntry ? (
                  <TodayIncomeBreakdown
                    bonus={selectedBonusMoney}
                    expense={selectedExpenseTotal}
                    income={selectedMainIncome}
                    received={selectedReceivedMoney}
                  />
                ) : (
                  <span>Chưa có thu nhập ngày này.</span>
                )}
              </div>

              <div className="money-income-progress-detail-list">
                {metrics.map((metric) => (
                  <div key={metric.id}>
                    <strong>{metric.label}</strong>
                    <span>{metric.scope} {metric.target}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
