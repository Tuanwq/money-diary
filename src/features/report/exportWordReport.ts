import { moodLabels } from "../../constants";
import type {
  BalanceCheckEntry,
  BalanceSnapshot,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../../types";
import { formatReportDate, getToday } from "../../utils/date";
import {
  getBonusMoney,
  getExpenseTotal,
  getMainIncome,
  getOtherExpenseItems,
  getReceivedMoney,
  getTotalEntryMoney,
} from "../../utils/entries";
import { getProgress, getSubGoalSaved } from "../../utils/goals";
import { formatMoney } from "../../utils/money";
import type { GoalForecast } from "../../utils/forecast";

export type GoalForecastReport = Pick<
  GoalForecast,
  | "status"
  | "fromDate"
  | "toDate"
  | "daysUsed"
  | "netAmount"
  | "averagePerDay"
  | "realisticAveragePerDay"
  | "daysToTarget"
  | "targetDate"
  | "deadlineDelayDays"
  | "deadlineDaysLeft"
  | "requiredAveragePerDay"
  | "dailyGapToDeadline"
  | "paceForecasts"
>;

export type ExportWordReportOptions = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  goals: Goals;
  totalIncome: number;
  totalExpense: number;
  actualMoney: number;
  totalSavedForBigGoal: number;
  remainingBigGoal: number;
  bigGoalProgress: number;
  bigGoalTimeProgress: number;
  needPerDay: number;
  isBigGoalBehind: boolean;
  safeForecastDays: number;
  goalForecast: GoalForecastReport;
  currentBalanceMovementData: BalanceSnapshot[];
  getBalanceStatus: (difference: number) => string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatSignedMoney(value: number) {
  return `${value > 0 ? "+" : ""}${formatMoney(value)}`;
}

function formatOtherExpense(expense: ExpenseEntry) {
  const items = getOtherExpenseItems(expense);

  if (items.length === 0) return formatMoney(expense.other);

  return items
    .map((item) => `${item.label}: ${formatMoney(item.amount)}`)
    .join("; ");
}

function reportCell(value: unknown, className = "") {
  const classAttribute = className ? ` class="${className}"` : "";

  return `<td${classAttribute}>${escapeHtml(value)}</td>`;
}

function emptyReportRow(colSpan: number, message: string) {
  return `<tr><td class="empty" colspan="${colSpan}">${escapeHtml(message)}</td></tr>`;
}

function tableRows(rows: Array<[unknown, unknown]>) {
  return rows
    .map(
      ([label, value]) =>
        `<tr>${reportCell(label)}${reportCell(value, "text-right strong")}</tr>`
    )
    .join("");
}

export function exportWordReport({
  entries,
  expenses,
  balanceChecks,
  completedGoals,
  goals,
  totalIncome,
  totalExpense,
  actualMoney,
  totalSavedForBigGoal,
  remainingBigGoal,
  bigGoalProgress,
  bigGoalTimeProgress,
  needPerDay,
  isBigGoalBehind,
  safeForecastDays,
  goalForecast,
  currentBalanceMovementData,
  getBalanceStatus,
}: ExportWordReportOptions) {
  const exportedAt = new Date();
  const sortedReportEntries = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const sortedReportExpenses = [...expenses].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const sortedReportBalanceChecks = [...balanceChecks].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const sortedCompletedGoals = [...completedGoals].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );
  const sortedSubGoals = [...(goals.subGoals ?? [])].sort((a, b) =>
    a.deadline.localeCompare(b.deadline)
  );
  const reportTotalHours = entries.reduce(
    (sum, entry) => sum + entry.workHours,
    0
  );
  const reportTotalOrders = entries.reduce(
    (sum, entry) => sum + (entry.orderCount ?? 0),
    0
  );
  const reportAverageIncome = entries.length
    ? Math.round(totalIncome / entries.length)
    : 0;
  const allSubGoalContributions = sortedSubGoals.flatMap((goal) =>
    [...goal.contributions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((contribution) => ({
        goalName: goal.name,
        ...contribution,
      }))
  );

  const summaryRows = tableRows([
    ["Tổng bản ghi nhật ký", entries.length],
    ["Tổng thu nhập", formatMoney(totalIncome)],
    ["Tổng chi tiêu", formatMoney(totalExpense)],
    ["Tiền thực tế hiện có", formatMoney(actualMoney)],
    ["Tổng giờ làm", `${reportTotalHours} giờ`],
    ["Tổng số đơn", `${reportTotalOrders} đơn`],
    ["Thu nhập trung bình / bản ghi", formatMoney(reportAverageIncome)],
    ["Số mục tiêu phụ đang theo dõi", sortedSubGoals.length],
    ["Số mục tiêu đã hoàn thành", completedGoals.length],
    ["Số lần kiểm kê số dư", balanceChecks.length],
  ]);

  const currentGoalRows = tableRows([
    ["Tên mục tiêu", goals.bigGoalName || "Chưa đặt tên"],
    ["Ngày bắt đầu", formatReportDate(goals.bigGoalStartDate)],
    ["Deadline", formatReportDate(goals.bigGoalDeadline)],
    ["Mục tiêu tiền", formatMoney(goals.bigGoalTarget)],
    ["Tiền ban đầu", formatMoney(goals.bigGoalSaved)],
    ["Tiền hiện có app tính", formatMoney(totalSavedForBigGoal)],
    ["Còn thiếu", formatMoney(remainingBigGoal)],
    ["Tiến độ tiền", `${bigGoalProgress}%`],
    ["Tiến độ thời gian", `${bigGoalTimeProgress}%`],
    ["Cần thêm mỗi ngày", formatMoney(needPerDay)],
    ["Trạng thái", isBigGoalBehind ? "Đang chậm tiến độ" : "Đúng tiến độ"],
    ["Dự đoán theo", `${safeForecastDays} ngày gần nhất`],
    ["Dòng tiền ròng dự đoán", formatMoney(goalForecast.netAmount)],
    ["Trung bình ròng / ngày", formatMoney(goalForecast.averagePerDay)],
    [
      "Tốc độ cần để kịp deadline",
      goalForecast.requiredAveragePerDay === null
        ? "Chưa có deadline"
        : formatMoney(goalForecast.requiredAveragePerDay),
    ],
    [
      "Tốc độ thực tế đã cân bằng",
      formatMoney(goalForecast.realisticAveragePerDay),
    ],
    [
      "Tốc độ 7 ngày so với deadline",
      goalForecast.dailyGapToDeadline === null
        ? "Chưa có deadline"
        : goalForecast.dailyGapToDeadline >= 0
          ? `Dư ${formatMoney(goalForecast.dailyGapToDeadline)}/ngày`
          : `Thiếu ${formatMoney(Math.abs(goalForecast.dailyGapToDeadline))}/ngày`,
    ],
    [
      "Dự đoán theo tốc độ 7 ngày",
      goalForecast.paceForecasts[0]?.targetDate
        ? `${formatReportDate(goalForecast.paceForecasts[0].targetDate)}${
            goalForecast.paceForecasts[0].deadlineDelayDays
              ? `, trễ ${goalForecast.paceForecasts[0].deadlineDelayDays} ngày`
              : ""
          }`
        : "Chưa đủ cơ sở dự đoán",
    ],
    [
      "Dự đoán theo tốc độ 30 ngày",
      goalForecast.paceForecasts[1]?.targetDate
        ? `${formatReportDate(goalForecast.paceForecasts[1].targetDate)}${
            goalForecast.paceForecasts[1].deadlineDelayDays
              ? `, trễ ${goalForecast.paceForecasts[1].deadlineDelayDays} ngày`
              : ""
          }`
        : "Chưa đủ cơ sở dự đoán",
    ],
    [
      "Ngày dự kiến đạt",
      goalForecast.targetDate
        ? formatReportDate(goalForecast.targetDate)
        : "Chưa đủ cơ sở dự đoán",
    ],
  ]);

  const targetRows = tableRows([
    ["Thu nhập / ngày", formatMoney(goals.dailyIncome)],
    ["Giờ làm / ngày", `${goals.dailyHours} giờ`],
    ["Thu nhập / tuần", formatMoney(goals.weeklyIncome)],
    ["Giờ làm / tuần", `${goals.weeklyHours} giờ`],
    ["Thu nhập / tháng", formatMoney(goals.monthlyIncome)],
    ["Giờ làm / tháng", `${goals.monthlyHours} giờ`],
  ]);

  const subGoalRows =
    sortedSubGoals.length === 0
      ? emptyReportRow(8, "Chưa có mục tiêu phụ.")
      : sortedSubGoals
          .map((goal) => {
            const currentSaved = getSubGoalSaved(goal);
            const remaining = Math.max(goal.target - currentSaved, 0);

            return `<tr>
              ${reportCell(goal.name)}
              ${reportCell(formatReportDate(goal.startDate))}
              ${reportCell(formatReportDate(goal.deadline))}
              ${reportCell(formatMoney(goal.target), "text-right")}
              ${reportCell(formatMoney(goal.saved), "text-right")}
              ${reportCell(formatMoney(currentSaved), "text-right strong")}
              ${reportCell(formatMoney(remaining), "text-right")}
              ${reportCell(`${getProgress(currentSaved, goal.target)}%`, "text-right")}
            </tr>`;
          })
          .join("");

  const contributionRows =
    allSubGoalContributions.length === 0
      ? emptyReportRow(4, "Chưa có lịch sử góp tiền cho mục tiêu phụ.")
      : allSubGoalContributions
          .map(
            (item) => `<tr>
              ${reportCell(item.goalName)}
              ${reportCell(formatReportDate(item.date))}
              ${reportCell(formatMoney(item.amount), "text-right strong")}
              ${reportCell(item.note || "")}
            </tr>`
          )
          .join("");

  const diaryRows =
    sortedReportEntries.length === 0
      ? emptyReportRow(10, "Chưa có dữ liệu nhật ký.")
      : sortedReportEntries
          .map((entry) => {
            const totalEntryMoney = getTotalEntryMoney(entry);

            return `<tr>
              ${reportCell(formatReportDate(entry.date))}
              ${reportCell(moodLabels[entry.mood] ?? entry.mood)}
              ${reportCell(formatMoney(getMainIncome(entry)), "text-right")}
              ${reportCell(formatMoney(getBonusMoney(entry)), "text-right")}
              ${reportCell(formatMoney(getReceivedMoney(entry)), "text-right")}
              ${reportCell(formatMoney(totalEntryMoney), "text-right strong")}
              ${reportCell(`${entry.workHours} giờ`, "text-right")}
              ${reportCell(`${entry.orderCount ?? 0} đơn`, "text-right")}
              ${reportCell(entry.diary || "")}
              ${reportCell(entry.note || "")}
            </tr>`;
          })
          .join("");

  const expenseRows =
    sortedReportExpenses.length === 0
      ? emptyReportRow(7, "Chưa có dữ liệu chi tiêu.")
      : sortedReportExpenses
          .map((expense) => {
            const total = getExpenseTotal(expense);

            return `<tr>
              ${reportCell(formatReportDate(expense.date))}
              ${reportCell(formatMoney(expense.breakfast), "text-right")}
              ${reportCell(formatMoney(expense.lunch), "text-right")}
              ${reportCell(formatMoney(expense.dinner), "text-right")}
              ${reportCell(formatOtherExpense(expense), "text-right")}
              ${reportCell(formatMoney(total), "text-right strong")}
              ${reportCell(expense.note || "")}
            </tr>`;
          })
          .join("");

  const balanceCheckRows =
    sortedReportBalanceChecks.length === 0
      ? emptyReportRow(8, "Chưa có lịch sử kiểm kê số dư.")
      : sortedReportBalanceChecks
          .map(
            (item) => `<tr>
              ${reportCell(formatReportDate(item.date))}
              ${reportCell(formatMoney(item.cash), "text-right")}
              ${reportCell(formatMoney(item.bank), "text-right")}
              ${reportCell(formatMoney(item.appMoney), "text-right")}
              ${reportCell(formatMoney(item.actualMoney), "text-right strong")}
              ${reportCell(formatSignedMoney(item.difference), "text-right")}
              ${reportCell(getBalanceStatus(item.difference))}
              ${reportCell(item.note || "")}
            </tr>`
          )
          .join("");

  const balanceMovementRows =
    currentBalanceMovementData.length === 0
      ? emptyReportRow(5, "Chưa có dữ liệu biến động tiền.")
      : currentBalanceMovementData
          .map(
            (item) => `<tr>
              ${reportCell(formatReportDate(item.date))}
              ${reportCell(formatMoney(item.income), "text-right")}
              ${reportCell(formatMoney(item.expense), "text-right")}
              ${reportCell(formatMoney(item.totalMoney), "text-right")}
              ${reportCell(formatMoney(item.actualMoney), "text-right strong")}
            </tr>`
          )
          .join("");

  const completedGoalRows =
    sortedCompletedGoals.length === 0
      ? emptyReportRow(10, "Chưa có mục tiêu hoàn thành.")
      : sortedCompletedGoals
          .map(
            (goal) => `<tr>
              ${reportCell(goal.name)}
              ${reportCell(goal.goalType === "sub" ? "Mục tiêu phụ" : "Mục tiêu chính")}
              ${reportCell(formatReportDate(goal.startDate))}
              ${reportCell(formatReportDate(goal.completedAt))}
              ${reportCell(formatReportDate(goal.deadline))}
              ${reportCell(formatMoney(goal.target), "text-right")}
              ${reportCell(formatMoney(goal.saved), "text-right strong")}
              ${reportCell(formatMoney(goal.totalIncome ?? 0), "text-right")}
              ${reportCell(formatMoney(goal.totalExpense ?? 0), "text-right")}
              ${reportCell(`${goal.totalHours ?? 0} giờ / ${goal.totalOrders ?? 0} đơn`)}
            </tr>`
          )
          .join("");

  const completedGoalDetailSections = sortedCompletedGoals
    .map((goal, index) => {
      const entriesSnapshotRows =
        !goal.entriesSnapshot || goal.entriesSnapshot.length === 0
          ? emptyReportRow(5, "Không có nhật ký lưu trong mục tiêu này.")
          : [...goal.entriesSnapshot]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(
                (entry) => `<tr>
                  ${reportCell(formatReportDate(entry.date))}
                  ${reportCell(formatMoney(getTotalEntryMoney(entry)), "text-right")}
                  ${reportCell(`${entry.workHours} giờ`, "text-right")}
                  ${reportCell(entry.diary || "")}
                  ${reportCell(entry.note || "")}
                </tr>`
              )
              .join("");
      const expensesSnapshotRows =
        !goal.expensesSnapshot || goal.expensesSnapshot.length === 0
          ? emptyReportRow(4, "Không có chi tiêu lưu trong mục tiêu này.")
          : [...goal.expensesSnapshot]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(
                (expense) => `<tr>
                  ${reportCell(formatReportDate(expense.date))}
                  ${reportCell(formatMoney(getExpenseTotal(expense)), "text-right strong")}
                  ${reportCell(formatOtherExpense(expense), "text-right")}
                  ${reportCell(expense.note || "")}
                </tr>`
              )
              .join("");
      const balanceSnapshotRows =
        !goal.balanceSnapshots || goal.balanceSnapshots.length === 0
          ? emptyReportRow(5, "Không có biến động tiền lưu trong mục tiêu này.")
          : [...goal.balanceSnapshots]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(
                (item) => `<tr>
                  ${reportCell(formatReportDate(item.date))}
                  ${reportCell(formatMoney(item.income), "text-right")}
                  ${reportCell(formatMoney(item.expense), "text-right")}
                  ${reportCell(formatMoney(item.totalMoney), "text-right")}
                  ${reportCell(formatMoney(item.actualMoney), "text-right strong")}
                </tr>`
              )
              .join("");
      const contributionSnapshotRows =
        !goal.contributionsSnapshot || goal.contributionsSnapshot.length === 0
          ? emptyReportRow(3, "Không có lịch sử góp tiền lưu trong mục tiêu này.")
          : [...goal.contributionsSnapshot]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(
                (item) => `<tr>
                  ${reportCell(formatReportDate(item.date))}
                  ${reportCell(formatMoney(item.amount), "text-right strong")}
                  ${reportCell(item.note || "")}
                </tr>`
              )
              .join("");

      return `
        <h3>${index + 1}. ${escapeHtml(goal.name)}</h3>
        <p class="muted">Hoàn thành ngày ${escapeHtml(formatReportDate(goal.completedAt))}</p>

        <h4>Nhật ký trong mục tiêu</h4>
        <table>
          <thead><tr><th>Ngày</th><th>Thu</th><th>Giờ</th><th>Nhật ký</th><th>Ghi chú</th></tr></thead>
          <tbody>${entriesSnapshotRows}</tbody>
        </table>

        <h4>Chi tiêu trong mục tiêu</h4>
        <table>
          <thead><tr><th>Ngày</th><th>Tổng chi</th><th>Khoản khác</th><th>Ghi chú</th></tr></thead>
          <tbody>${expensesSnapshotRows}</tbody>
        </table>

        <h4>Biến động tiền trong mục tiêu</h4>
        <table>
          <thead><tr><th>Ngày</th><th>Thu</th><th>Chi</th><th>Tổng tiền</th><th>Tiền thực tế</th></tr></thead>
          <tbody>${balanceSnapshotRows}</tbody>
        </table>

        <h4>Lịch sử góp tiền</h4>
        <table>
          <thead><tr><th>Ngày</th><th>Số tiền</th><th>Ghi chú</th></tr></thead>
          <tbody>${contributionSnapshotRows}</tbody>
        </table>
      `;
    })
    .join("");

  const htmlContent = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Báo cáo Money Diary</title>
        <style>
          body { color: #1C271F; font-family: "Be Vietnam Pro", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; font-weight: 400; line-height: 1.45; }
          h1 { font-size: 24px; font-weight: 700; margin: 0 0 6px; text-align: center; }
          h2 { border-bottom: 2px solid #557A5B; font-size: 18px; margin: 28px 0 10px; padding-bottom: 5px; }
          h3 { font-size: 15px; margin: 22px 0 6px; }
          h4 { color: #5F6E63; font-size: 13px; margin: 16px 0 6px; }
          table { border-collapse: collapse; margin: 8px 0 18px; width: 100%; }
          th, td { border: 1px solid #DCE4DC; padding: 7px; vertical-align: top; }
          th { background: #EEF4EF; color: #1C271F; font-weight: 700; text-align: left; }
          .subtitle, .muted, .footer { color: #5F6E63; }
          .subtitle { margin: 0 0 22px; text-align: center; }
          .text-right { text-align: right; white-space: nowrap; }
          .strong { font-weight: 700; }
          .empty { color: #5F6E63; font-style: italic; text-align: center; }
          .footer { border-top: 1px solid #DCE4DC; margin-top: 32px; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Báo cáo tài chính Money Diary</h1>
        <p class="subtitle">Ngày lập báo cáo: ${escapeHtml(exportedAt.toLocaleString("vi-VN"))}</p>
        <h2>1. Tổng quan</h2><table><tbody>${summaryRows}</tbody></table>
        <h2>2. Mục tiêu chính hiện tại</h2><table><tbody>${currentGoalRows}</tbody></table>
        <h2>3. Chỉ tiêu ngày, tuần, tháng</h2><table><tbody>${targetRows}</tbody></table>
        <h2>4. Mục tiêu phụ đang theo dõi</h2>
        <table>
          <thead><tr><th>Tên mục tiêu</th><th>Bắt đầu</th><th>Deadline</th><th>Mục tiêu</th><th>Tiền ban đầu</th><th>Đã có</th><th>Còn thiếu</th><th>Tiến độ</th></tr></thead>
          <tbody>${subGoalRows}</tbody>
        </table>
        <h2>5. Lịch sử góp tiền mục tiêu phụ</h2>
        <table><thead><tr><th>Mục tiêu</th><th>Ngày</th><th>Số tiền</th><th>Ghi chú</th></tr></thead><tbody>${contributionRows}</tbody></table>
        <h2>6. Lịch sử nhật ký thu nhập</h2>
        <table><thead><tr><th>Ngày</th><th>Tâm trạng</th><th>Tiền làm</th><th>Thưởng</th><th>Tiền nhận</th><th>Tổng ngày</th><th>Giờ</th><th>Đơn</th><th>Nhật ký</th><th>Ghi chú</th></tr></thead><tbody>${diaryRows}</tbody></table>
        <h2>7. Lịch sử chi tiêu</h2>
        <table><thead><tr><th>Ngày</th><th>Ăn sáng</th><th>Ăn trưa</th><th>Ăn tối</th><th>Khác / nhãn</th><th>Tổng chi</th><th>Ghi chú</th></tr></thead><tbody>${expenseRows}</tbody></table>
        <h2>8. Lịch sử kiểm kê số dư</h2>
        <table><thead><tr><th>Ngày</th><th>Tiền mặt</th><th>Tài khoản</th><th>App tính</th><th>Thực tế</th><th>Chênh lệch</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>${balanceCheckRows}</tbody></table>
        <h2>9. Biến động tiền mục tiêu hiện tại</h2>
        <table><thead><tr><th>Ngày</th><th>Thu</th><th>Chi</th><th>Tổng tiền</th><th>Tiền thực tế</th></tr></thead><tbody>${balanceMovementRows}</tbody></table>
        <h2>10. Mục tiêu đã hoàn thành</h2>
        <table><thead><tr><th>Tên mục tiêu</th><th>Loại</th><th>Bắt đầu</th><th>Hoàn thành</th><th>Deadline</th><th>Mục tiêu</th><th>Đã đạt</th><th>Tổng thu</th><th>Tổng chi</th><th>Giờ / đơn</th></tr></thead><tbody>${completedGoalRows}</tbody></table>
        ${completedGoalDetailSections ? `<h2>11. Chi tiết mục tiêu đã hoàn thành</h2>${completedGoalDetailSections}` : ""}
        <p class="footer">Báo cáo được xuất tự động từ Money Diary.</p>
      </body>
    </html>`;

  const blob = new Blob([`\ufeff${htmlContent}`], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Money_Diary_Bao_Cao_${getToday()}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
