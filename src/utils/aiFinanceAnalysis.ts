import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../types";
import { addDaysToDateString, formatDateShort, toDate } from "./date";
import {
  getBonusMoney,
  getExpenseTotal,
  getMainIncome,
  getReceivedMoney,
  getTotalEntryMoney,
} from "./entries";
import { formatMoney } from "./money";

export type AiFinanceRange = "today" | "last7" | "last30" | "thisMonth";

export type AiFinanceMetric = {
  label: string;
  value: string;
  detail: string;
};

export type AiFinanceAnalysis = {
  title: string;
  rangeLabel: string;
  fromDate: string;
  toDate: string;
  summary: string;
  metrics: AiFinanceMetric[];
  highlights: string[];
  risks: string[];
  actions: string[];
};

type BuildAiFinanceAnalysisOptions = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  goals: Goals;
  today: string;
  range: AiFinanceRange;
};

type DayFinanceRow = {
  date: string;
  mainIncome: number;
  bonusMoney: number;
  receivedMoney: number;
  totalIncome: number;
  expense: number;
  net: number;
  workHours: number;
  orderCount: number;
};

export const AI_FINANCE_RANGE_OPTIONS: Array<{
  label: string;
  value: AiFinanceRange;
}> = [
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "last7" },
  { label: "30 ngày", value: "last30" },
  { label: "Tháng này", value: "thisMonth" },
];

function getRange(today: string, range: AiFinanceRange) {
  if (range === "today") {
    return {
      label: "hôm nay",
      fromDate: today,
      toDate: today,
    };
  }

  if (range === "last7") {
    return {
      label: "7 ngày gần nhất",
      fromDate: addDaysToDateString(today, -6),
      toDate: today,
    };
  }

  if (range === "last30") {
    return {
      label: "30 ngày gần nhất",
      fromDate: addDaysToDateString(today, -29),
      toDate: today,
    };
  }

  return {
    label: "tháng này",
    fromDate: `${today.slice(0, 7)}-01`,
    toDate: today,
  };
}

function getDayCount(fromDate: string, toDate: string) {
  const diffTime = toDateStringMs(toDate) - toDateStringMs(fromDate);

  return Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1, 1);
}

function toDateStringMs(date: string) {
  return toDate(date).getTime();
}

function buildRows({
  entries,
  expenses,
  fromDate,
  toDate,
}: {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  fromDate: string;
  toDate: string;
}) {
  const rows: DayFinanceRow[] = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    const dayEntries = entries.filter((entry) => entry.date === cursor);
    const dayExpenses = expenses.filter((expense) => expense.date === cursor);
    const mainIncome = dayEntries.reduce(
      (sum, entry) => sum + getMainIncome(entry),
      0
    );
    const bonusMoney = dayEntries.reduce(
      (sum, entry) => sum + getBonusMoney(entry),
      0
    );
    const receivedMoney = dayEntries.reduce(
      (sum, entry) => sum + getReceivedMoney(entry),
      0
    );
    const totalIncome = dayEntries.reduce(
      (sum, entry) => sum + getTotalEntryMoney(entry),
      0
    );
    const expense = dayExpenses.reduce(
      (sum, item) => sum + getExpenseTotal(item),
      0
    );

    rows.push({
      date: cursor,
      mainIncome,
      bonusMoney,
      receivedMoney,
      totalIncome,
      expense,
      net: totalIncome - expense,
      workHours: dayEntries.reduce(
        (sum, entry) => sum + (entry.workHours ?? 0),
        0
      ),
      orderCount: dayEntries.reduce(
        (sum, entry) => sum + (entry.orderCount ?? 0),
        0
      ),
    });

    cursor = addDaysToDateString(cursor, 1);
  }

  return rows;
}

function sumRows(rows: DayFinanceRow[]) {
  return rows.reduce(
    (total, row) => ({
      mainIncome: total.mainIncome + row.mainIncome,
      bonusMoney: total.bonusMoney + row.bonusMoney,
      receivedMoney: total.receivedMoney + row.receivedMoney,
      totalIncome: total.totalIncome + row.totalIncome,
      expense: total.expense + row.expense,
      net: total.net + row.net,
      workHours: total.workHours + row.workHours,
      orderCount: total.orderCount + row.orderCount,
    }),
    {
      mainIncome: 0,
      bonusMoney: 0,
      receivedMoney: 0,
      totalIncome: 0,
      expense: 0,
      net: 0,
      workHours: 0,
      orderCount: 0,
    }
  );
}

function findBestDay(rows: DayFinanceRow[]) {
  return rows
    .filter((row) => row.totalIncome > 0 || row.expense > 0)
    .sort((a, b) => b.net - a.net)[0];
}

function findWorstDay(rows: DayFinanceRow[]) {
  return rows
    .filter((row) => row.totalIncome > 0 || row.expense > 0)
    .sort((a, b) => a.net - b.net)[0];
}

function getLatestBalanceCheck(
  balanceChecks: BalanceCheckEntry[],
  fromDate: string,
  toDate: string
) {
  return [...balanceChecks]
    .filter((item) => item.date >= fromDate && item.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function getNeedPerDay({
  entries,
  expenses,
  goals,
  today,
}: Pick<
  BuildAiFinanceAnalysisOptions,
  "entries" | "expenses" | "goals" | "today"
>) {
  const totalIncome = entries.reduce(
    (sum, entry) => sum + getTotalEntryMoney(entry),
    0
  );
  const totalExpense = expenses.reduce(
    (sum, expense) => sum + getExpenseTotal(expense),
    0
  );
  const actualMoney = goals.bigGoalSaved + totalIncome - totalExpense;
  const remaining = Math.max(goals.bigGoalTarget - actualMoney, 0);
  const daysLeft = Math.max(
    Math.ceil(
      (toDate(goals.bigGoalDeadline).getTime() - toDate(today).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    0
  );

  return daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
}

function getTrendLabel(currentNet: number, previousNet: number) {
  if (previousNet === 0 && currentNet === 0) return "chưa có biến động";
  if (previousNet === 0) return "tốt hơn kỳ trước";

  const diffPercent = Math.round(
    ((currentNet - previousNet) / Math.abs(previousNet)) * 100
  );

  if (diffPercent > 5) return `tăng ${diffPercent}% so với kỳ trước`;
  if (diffPercent < -5) return `giảm ${Math.abs(diffPercent)}% so với kỳ trước`;

  return "gần như ngang kỳ trước";
}

export function buildAiFinanceAnalysis({
  entries,
  expenses,
  balanceChecks,
  goals,
  today,
  range,
}: BuildAiFinanceAnalysisOptions): AiFinanceAnalysis {
  const selectedRange = getRange(today, range);
  const dayCount = getDayCount(selectedRange.fromDate, selectedRange.toDate);
  const rows = buildRows({
    entries,
    expenses,
    fromDate: selectedRange.fromDate,
    toDate: selectedRange.toDate,
  });
  const previousToDate = addDaysToDateString(selectedRange.fromDate, -1);
  const previousFromDate = addDaysToDateString(previousToDate, -dayCount + 1);
  const previousRows = buildRows({
    entries,
    expenses,
    fromDate: previousFromDate,
    toDate: previousToDate,
  });
  const totals = sumRows(rows);
  const previousTotals = sumRows(previousRows);
  const activeDays = rows.filter(
    (row) => row.totalIncome > 0 || row.expense > 0
  ).length;
  const missingExpenseDays = rows.filter(
    (row) => row.totalIncome > 0 && row.expense === 0
  ).length;
  const reachedDailyGoalDays = rows.filter((row) => {
    return goals.dailyIncome > 0 && row.mainIncome + row.bonusMoney >= goals.dailyIncome;
  }).length;
  const expenseRatio =
    totals.totalIncome > 0
      ? Math.round((totals.expense / totals.totalIncome) * 100)
      : 0;
  const averageNet = Math.round(totals.net / dayCount);
  const averageExpense = Math.round(totals.expense / dayCount);
  const incomePerHour =
    totals.workHours > 0
      ? Math.round((totals.mainIncome + totals.bonusMoney) / totals.workHours)
      : 0;
  const targetIncomePerHour =
    goals.dailyHours > 0 ? Math.round(goals.dailyIncome / goals.dailyHours) : 0;
  const needPerDay = getNeedPerDay({ entries, expenses, goals, today });
  const bestDay = findBestDay(rows);
  const worstDay = findWorstDay(rows);
  const latestBalanceCheck = getLatestBalanceCheck(
    balanceChecks,
    selectedRange.fromDate,
    selectedRange.toDate
  );
  const trendLabel = getTrendLabel(totals.net, previousTotals.net);
  const highlights: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  if (totals.net > 0) {
    highlights.push(
      `Dòng tiền ròng đang dương ${formatMoney(totals.net)} trong ${selectedRange.label}.`
    );
  }

  if (bestDay) {
    highlights.push(
      `Ngày tốt nhất là ${formatDateShort(bestDay.date)} với ròng ${formatMoney(
        bestDay.net
      )}.`
    );
  }

  if (reachedDailyGoalDays > 0) {
    highlights.push(
      `${reachedDailyGoalDays}/${dayCount} ngày đạt hoặc vượt mục tiêu ngày.`
    );
  }

  if (totals.net <= 0 && activeDays > 0) {
    risks.push(
      `Dòng tiền ròng chưa dương, hiện là ${formatMoney(totals.net)}.`
    );
  }

  if (expenseRatio >= 35) {
    risks.push(
      `Chi tiêu đang chiếm ${expenseRatio}% tổng tiền vào, cần kiểm soát chặt hơn.`
    );
  }

  if (missingExpenseDays > 0) {
    risks.push(
      `${missingExpenseDays} ngày có thu nhập nhưng chưa ghi chi tiêu, số liệu ròng có thể đang đẹp hơn thực tế.`
    );
  }

  if (averageNet < needPerDay && needPerDay > 0) {
    risks.push(
      `Trung bình ròng ${formatMoney(
        averageNet
      )}/ngày thấp hơn nhịp cần ${formatMoney(needPerDay)}/ngày.`
    );
  }

  if (incomePerHour > 0 && targetIncomePerHour > 0 && incomePerHour < targetIncomePerHour) {
    risks.push(
      `Tiền/giờ ${formatMoney(
        incomePerHour
      )} thấp hơn mốc mục tiêu ${formatMoney(targetIncomePerHour)}.`
    );
  }

  if (latestBalanceCheck && Math.abs(latestBalanceCheck.difference) >= 50000) {
    risks.push(
      `Kiểm kê gần nhất lệch ${formatMoney(
        latestBalanceCheck.difference
      )}, nên đối chiếu lại tiền mặt và tài khoản.`
    );
  }

  if (worstDay && worstDay.net < 0) {
    risks.push(
      `Ngày yếu nhất là ${formatDateShort(worstDay.date)} với ròng ${formatMoney(
        worstDay.net
      )}.`
    );
  }

  if (averageNet < needPerDay && needPerDay > 0) {
    actions.push(
      `Tăng thêm khoảng ${formatMoney(
        needPerDay - averageNet
      )}/ngày hoặc giảm chi tương ứng để bám mục tiêu lớn.`
    );
  }

  if (expenseRatio >= 35) {
    actions.push(
      `Đặt trần chi tiêu quanh ${formatMoney(
        Math.max(0, Math.round(totals.totalIncome * 0.25) / dayCount)
      )}/ngày trong giai đoạn này.`
    );
  }

  if (incomePerHour > 0 && bestDay) {
    actions.push(
      `So lại ca làm của ngày ${formatDateShort(
        bestDay.date
      )} để ưu tiên kiểu ca có tiền/giờ tốt hơn.`
    );
  }

  if (missingExpenseDays > 0) {
    actions.push("Bổ sung chi tiêu còn thiếu trước khi dùng số liệu để chốt kế hoạch.");
  }

  if (actions.length === 0) {
    actions.push("Giữ nhịp nhập dữ liệu đều và tiếp tục theo dõi tiền/giờ.");
  }

  if (highlights.length === 0) {
    highlights.push("Chưa có điểm mạnh rõ ràng vì dữ liệu trong giai đoạn này còn mỏng.");
  }

  if (risks.length === 0) {
    risks.push("Chưa thấy rủi ro lớn trong phạm vi đang xem.");
  }

  const summary =
    activeDays === 0
      ? `Chưa có đủ dữ liệu trong ${selectedRange.label}.`
      : `Trong ${selectedRange.label}, bạn ròng ${formatMoney(
          totals.net
        )}, trung bình ${formatMoney(
          averageNet
        )}/ngày và xu hướng ${trendLabel}.`;

  return {
    title: "AI phân tích tài chính",
    rangeLabel: selectedRange.label,
    fromDate: selectedRange.fromDate,
    toDate: selectedRange.toDate,
    summary,
    metrics: [
      {
        label: "Tiền ròng",
        value: formatMoney(totals.net),
        detail: `Thu ${formatMoney(totals.totalIncome)} - chi ${formatMoney(
          totals.expense
        )}`,
      },
      {
        label: "Tiền làm được",
        value: formatMoney(totals.mainIncome + totals.bonusMoney),
        detail: `Chưa tính tiền nhận riêng: ${formatMoney(totals.receivedMoney)}`,
      },
      {
        label: "Chi tiêu/ngày",
        value: formatMoney(averageExpense),
        detail: `Tỷ lệ chi: ${expenseRatio}%`,
      },
      {
        label: "Tiền/giờ",
        value: incomePerHour > 0 ? formatMoney(incomePerHour) : "Chưa có",
        detail: `${totals.workHours.toFixed(1)} giờ · ${totals.orderCount} đơn`,
      },
      {
        label: "Ngày có dữ liệu",
        value: `${activeDays}/${dayCount}`,
        detail: `${reachedDailyGoalDays} ngày đạt mục tiêu ngày`,
      },
      {
        label: "Nhịp cần",
        value: formatMoney(needPerDay),
        detail: "Mức ròng/ngày để bám mục tiêu lớn",
      },
    ],
    highlights: highlights.slice(0, 4),
    risks: risks.slice(0, 4),
    actions: actions.slice(0, 4),
  };
}
