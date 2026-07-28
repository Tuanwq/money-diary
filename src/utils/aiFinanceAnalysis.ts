import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  Goals,
  Page,
} from "../types";
import { addDaysToDateString, formatDateShort, toDate } from "./date";
import {
  buildOtherExpenseBreakdown,
  getBonusMoney,
  getExpenseTotal,
  getMainIncome,
  getReceivedMoney,
  getTotalEntryMoney,
  UNLABELED_OTHER_EXPENSE_LABEL,
  type OtherExpenseBreakdownItem,
} from "./entries";
import { formatMoney } from "./money";

export type AiFinanceRange = "today" | "last7" | "last30" | "thisMonth";

export type AiFinanceMetric = {
  key:
    | "net"
    | "workIncome"
    | "expense"
    | "topOtherExpense"
    | "incomePerHour"
    | "activeDays"
    | "requiredPace";
  label: string;
  value: string;
  detail: string;
  currentValue: number;
  previousValue: number;
  changeValue: number;
  changePercent: number | null;
  changeLabel: string;
  positiveWhenUp: boolean;
  sources: AiFinanceSource[];
};

export type AiFinanceSource = {
  label: string;
  value: string;
  amount: number;
  share: number;
  tone: "expense" | "income" | "neutral";
};

export type AiFinanceAnomaly = {
  actionLabel: string;
  actionPage: Page;
  date?: string;
  detail: string;
  id: string;
  severity: "danger" | "warning" | "info";
  title: string;
};

export type AiFinanceActionPlanItem = {
  actionLabel: string;
  actionPage: Page;
  detail: string;
  id: string;
  impact: string;
  target: string;
  title: string;
};

export type AiFinanceAnalysis = {
  title: string;
  rangeLabel: string;
  fromDate: string;
  toDate: string;
  previousFromDate: string;
  previousToDate: string;
  summary: string;
  comparisonSummary: string;
  metrics: AiFinanceMetric[];
  otherExpenseBreakdown: OtherExpenseBreakdownItem[];
  highlights: string[];
  risks: string[];
  actions: string[];
  anomalies: AiFinanceAnomaly[];
  actionPlan: AiFinanceActionPlanItem[];
  facts: {
    activeDays: number;
    averageExpense: number;
    averageNet: number;
    dayCount: number;
    expenseRatio: number;
    incomePerHour: number;
    needPerDay: number;
    orderCount: number;
    previousNet: number;
    totalExpense: number;
    totalIncome: number;
    totalNet: number;
    workHours: number;
  };
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

function getChange(
  currentValue: number,
  previousValue: number,
  formatter: (value: number) => string = formatMoney
) {
  const changeValue = currentValue - previousValue;
  const changePercent =
    previousValue === 0
      ? null
      : Math.round((changeValue / Math.abs(previousValue)) * 100);
  const changeLabel =
    previousValue === 0
      ? currentValue === 0
        ? "Không đổi"
        : "Kỳ trước chưa có"
      : Math.abs(changePercent ?? 0) <= 1
        ? "Gần như không đổi"
        : `${changeValue >= 0 ? "Tăng" : "Giảm"} ${formatter(
            Math.abs(changeValue)
          )} (${Math.abs(changePercent ?? 0)}%)`;

  return {
    changeLabel,
    changePercent,
    changeValue,
  };
}

function buildMoneySource(
  label: string,
  amount: number,
  total: number,
  tone: AiFinanceSource["tone"]
): AiFinanceSource {
  return {
    amount,
    label,
    share: total > 0 ? Math.round((Math.abs(amount) / total) * 100) : 0,
    tone,
    value: formatMoney(amount),
  };
}

function buildMetric({
  currentValue,
  changeFormatter = formatMoney,
  detail,
  formatter = formatMoney,
  key,
  label,
  positiveWhenUp = true,
  previousValue,
  sources,
}: {
  currentValue: number;
  changeFormatter?: (value: number) => string;
  detail: string;
  formatter?: (value: number) => string;
  key: AiFinanceMetric["key"];
  label: string;
  positiveWhenUp?: boolean;
  previousValue: number;
  sources: AiFinanceSource[];
}): AiFinanceMetric {
  return {
    ...getChange(currentValue, previousValue, changeFormatter),
    currentValue,
    detail,
    key,
    label,
    positiveWhenUp,
    previousValue,
    sources,
    value: formatter(currentValue),
  };
}

function getMealExpenseTotal(
  expenses: ExpenseEntry[],
  fromDate: string,
  toDate: string
) {
  return expenses
    .filter((expense) => expense.date >= fromDate && expense.date <= toDate)
    .reduce(
      (total, expense) =>
        total + expense.breakfast + expense.lunch + expense.dinner,
      0
    );
}

function getOtherExpenseTotal(
  expenses: ExpenseEntry[],
  fromDate: string,
  toDate: string
) {
  return expenses
    .filter((expense) => expense.date >= fromDate && expense.date <= toDate)
    .reduce((total, expense) => total + expense.other, 0);
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
  const previousActiveDays = previousRows.filter(
    (row) => row.totalIncome > 0 || row.expense > 0
  ).length;
  const missingExpenseDays = rows.filter(
    (row) => row.totalIncome > 0 && row.expense === 0
  );
  const reachedDailyGoalDays = rows.filter((row) => {
    return goals.dailyIncome > 0 && row.mainIncome + row.bonusMoney >= goals.dailyIncome;
  }).length;
  const expenseRatio =
    totals.totalIncome > 0
      ? Math.round((totals.expense / totals.totalIncome) * 100)
      : 0;
  const averageNet = Math.round(totals.net / dayCount);
  const averageExpense = Math.round(totals.expense / dayCount);
  const previousAverageExpense = Math.round(previousTotals.expense / dayCount);
  const incomePerHour =
    totals.workHours > 0
      ? Math.round((totals.mainIncome + totals.bonusMoney) / totals.workHours)
      : 0;
  const previousIncomePerHour =
    previousTotals.workHours > 0
      ? Math.round(
          (previousTotals.mainIncome + previousTotals.bonusMoney) /
            previousTotals.workHours
        )
      : 0;
  const targetIncomePerHour =
    goals.dailyHours > 0 ? Math.round(goals.dailyIncome / goals.dailyHours) : 0;
  const needPerDay = getNeedPerDay({ entries, expenses, goals, today });
  const allRecordedIncome = entries.reduce(
    (sum, entry) => sum + getTotalEntryMoney(entry),
    0
  );
  const allRecordedExpense = expenses.reduce(
    (sum, expense) => sum + getExpenseTotal(expense),
    0
  );
  const currentGoalMoney =
    goals.bigGoalSaved + allRecordedIncome - allRecordedExpense;
  const remainingGoalMoney = Math.max(
    goals.bigGoalTarget - currentGoalMoney,
    0
  );
  const goalDaysLeft = Math.max(
    Math.ceil(
      (toDate(goals.bigGoalDeadline).getTime() - toDate(today).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    0
  );
  const bestDay = findBestDay(rows);
  const worstDay = findWorstDay(rows);
  const latestBalanceCheck = getLatestBalanceCheck(
    balanceChecks,
    selectedRange.fromDate,
    selectedRange.toDate
  );
  const otherExpenseBreakdown = buildOtherExpenseBreakdown(expenses, {
    fromDate: selectedRange.fromDate,
    toDate: selectedRange.toDate,
  });
  const topOtherExpense = otherExpenseBreakdown[0];
  const previousOtherExpenseBreakdown = buildOtherExpenseBreakdown(expenses, {
    fromDate: previousFromDate,
    toDate: previousToDate,
  });
  const previousTopOtherExpense = previousOtherExpenseBreakdown[0];
  const mealExpense = getMealExpenseTotal(
    expenses,
    selectedRange.fromDate,
    selectedRange.toDate
  );
  const otherExpense = getOtherExpenseTotal(
    expenses,
    selectedRange.fromDate,
    selectedRange.toDate
  );
  const trendLabel = getTrendLabel(totals.net, previousTotals.net);
  const highlights: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];
  const anomalies: AiFinanceAnomaly[] = [];
  const actionPlan: AiFinanceActionPlanItem[] = [];

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

  if (topOtherExpense) {
    highlights.push(
      `Khoản khác lớn nhất là ${topOtherExpense.label}: ${formatMoney(
        topOtherExpense.total
      )} qua ${topOtherExpense.count} lần ghi.`
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

  if (missingExpenseDays.length > 0) {
    risks.push(
      `${missingExpenseDays.length} ngày có thu nhập nhưng chưa ghi chi tiêu, số liệu ròng có thể đang đẹp hơn thực tế.`
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

  if (
    topOtherExpense &&
    totals.expense > 0 &&
    topOtherExpense.total / totals.expense >= 0.3
  ) {
    risks.push(
      `${topOtherExpense.label} đang chiếm ${Math.round(
        (topOtherExpense.total / totals.expense) * 100
      )}% tổng chi tiêu trong kỳ.`
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

  if (missingExpenseDays.length > 0) {
    actions.push("Bổ sung chi tiêu còn thiếu trước khi dùng số liệu để chốt kế hoạch.");
  }

  if (
    otherExpenseBreakdown.some(
      (item) => item.label === UNLABELED_OTHER_EXPENSE_LABEL
    )
  ) {
    actions.push("Gắn nhãn cho các khoản khác chưa phân loại để AI đọc chi tiêu chính xác hơn.");
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
  const comparisonSummary = `So với ${formatDateShort(
    previousFromDate
  )} - ${formatDateShort(previousToDate)}, tiền ròng ${
    getChange(totals.net, previousTotals.net).changeLabel.toLocaleLowerCase(
      "vi-VN"
    )
  }.`;
  const unlabeledExpense = otherExpenseBreakdown.find(
    (item) => item.label === UNLABELED_OTHER_EXPENSE_LABEL
  );
  const outlierExpenseDay = [...rows]
    .filter(
      (row) =>
        row.expense > 0 &&
        previousAverageExpense > 0 &&
        row.expense >= previousAverageExpense * 1.5
    )
    .sort((left, right) => right.expense - left.expense)[0];

  if (missingExpenseDays.length > 0) {
    const firstMissingDate = missingExpenseDays[0].date;
    anomalies.push({
      actionLabel: "Bổ sung chi tiêu",
      actionPage: "closeDay",
      date: firstMissingDate,
      detail: `${missingExpenseDays.length} ngày có thu nhập nhưng chi tiêu bằng 0. Ngày đầu tiên cần kiểm tra là ${formatDateShort(
        firstMissingDate
      )}.`,
      id: "missing-expense",
      severity: "warning",
      title: "Có thể đang thiếu chi tiêu",
    });
  }

  if (unlabeledExpense && unlabeledExpense.total > 0) {
    anomalies.push({
      actionLabel: "Gắn nhãn khoản chi",
      actionPage: "expenses",
      detail: `${formatMoney(
        unlabeledExpense.total
      )} trong ${unlabeledExpense.count} khoản khác chưa được phân loại.`,
      id: "unlabeled-expense",
      severity: "warning",
      title: "Khoản chi chưa có nhãn",
    });
  }

  if (outlierExpenseDay) {
    anomalies.push({
      actionLabel: "Xem lịch sử chi",
      actionPage: "expenses",
      date: outlierExpenseDay.date,
      detail: `Ngày ${formatDateShort(
        outlierExpenseDay.date
      )} chi ${formatMoney(
        outlierExpenseDay.expense
      )}, cao hơn đáng kể mức trung bình kỳ trước ${formatMoney(
        previousAverageExpense
      )}/ngày.`,
      id: "expense-spike",
      severity: "warning",
      title: "Chi tiêu tăng bất thường",
    });
  }

  if (latestBalanceCheck && Math.abs(latestBalanceCheck.difference) >= 50000) {
    anomalies.push({
      actionLabel: "Đối chiếu số dư",
      actionPage: "balanceChecks",
      date: latestBalanceCheck.date,
      detail: `Kiểm kê ngày ${formatDateShort(
        latestBalanceCheck.date
      )} lệch ${formatMoney(
        latestBalanceCheck.difference
      )} so với số app tính.`,
      id: "balance-gap",
      severity:
        Math.abs(latestBalanceCheck.difference) >= 200000
          ? "danger"
          : "warning",
      title: "Số dư thực tế đang lệch",
    });
  }

  if (
    incomePerHour > 0 &&
    previousIncomePerHour > 0 &&
    incomePerHour < previousIncomePerHour * 0.75
  ) {
    anomalies.push({
      actionLabel: "Xem hiệu suất Hub",
      actionPage: "hub",
      detail: `Tiền/giờ hiện tại ${formatMoney(
        incomePerHour
      )}, thấp hơn kỳ trước ${formatMoney(previousIncomePerHour)}.`,
      id: "low-hourly-income",
      severity: "warning",
      title: "Hiệu suất làm việc giảm",
    });
  }

  if (averageNet < needPerDay && needPerDay > 0) {
    anomalies.push({
      actionLabel: "Xem mục tiêu",
      actionPage: "goals",
      detail: `Trung bình ròng đang thiếu ${formatMoney(
        needPerDay - averageNet
      )}/ngày so với nhịp cần để kịp mục tiêu chính.`,
      id: "goal-pace-gap",
      severity: "danger",
      title: "Mục tiêu đang chậm nhịp",
    });
  }

  const targetNet = Math.max(needPerDay, goals.dailyIncome);
  const suggestedExpenseCap =
    averageExpense > 0
      ? Math.max(Math.round(averageExpense * 0.9), 0)
      : Math.max(Math.round(targetNet * 0.25), 0);
  const netGap = Math.max(targetNet - averageNet, 0);
  const incomePerOrder =
    totals.orderCount > 0
      ? Math.round(
          (totals.mainIncome + totals.bonusMoney) / totals.orderCount
        )
      : 0;
  const extraHours =
    netGap > 0 && incomePerHour > 0 ? netGap / incomePerHour : 0;
  const extraOrders =
    netGap > 0 && incomePerOrder > 0
      ? Math.ceil(netGap / incomePerOrder)
      : 0;

  actionPlan.push({
    actionLabel: "Nhập thu nhập",
    actionPage: "hub",
    detail: `Đây là mức ròng tối thiểu để giữ nhịp mục tiêu chính, đã đối chiếu với mục tiêu ngày ${formatMoney(
      goals.dailyIncome
    )}.`,
    id: "target-net",
    impact:
      netGap > 0
        ? `Cao hơn nhịp hiện tại ${formatMoney(netGap)}/ngày`
        : "Nhịp hiện tại đã đạt mức này",
    target: formatMoney(targetNet),
    title: "Mục tiêu ròng ngày mai",
  });

  actionPlan.push({
    actionLabel: "Quản lý chi tiêu",
    actionPage: "expenses",
    detail: `Giới hạn này thấp hơn khoảng 10% so với mức chi trung bình ${formatMoney(
      averageExpense
    )}/ngày trong kỳ.`,
    id: "expense-cap",
    impact: `Nếu giữ được, ròng tăng khoảng ${formatMoney(
      Math.max(averageExpense - suggestedExpenseCap, 0)
    )}/ngày`,
    target: formatMoney(suggestedExpenseCap),
    title: "Trần chi tiêu đề xuất",
  });

  if (netGap > 0) {
    actionPlan.push({
      actionLabel: "Chọn ca Hub",
      actionPage: "hub",
      detail:
        incomePerHour > 0 || incomePerOrder > 0
          ? `Theo hiệu suất hiện tại, cần thêm khoảng ${
              extraHours > 0 ? `${extraHours.toFixed(1)} giờ` : "chưa đủ dữ liệu giờ"
            }${
              extraOrders > 0 ? ` hoặc ${extraOrders} đơn` : ""
            }.`
          : "Chưa đủ dữ liệu tiền/giờ và tiền/đơn để quy đổi khối lượng làm việc.",
      id: "work-gap",
      impact: `Bù phần thiếu ${formatMoney(netGap)}/ngày`,
      target: formatMoney(netGap),
      title: "Thu nhập cần bù thêm",
    });
  }

  if (anomalies.length > 0) {
    actionPlan.push({
      actionLabel: "Xử lý bất thường",
      actionPage: anomalies[0].actionPage,
      detail: `Ưu tiên xử lý “${anomalies[0].title}” trước khi dùng số liệu để quyết định.`,
      id: "data-cleanup",
      impact: `${anomalies.length} vấn đề đang ảnh hưởng độ tin cậy`,
      target: `${anomalies.length} mục`,
      title: "Làm sạch dữ liệu",
    });
  }

  const netSourceTotal = Math.max(
    totals.mainIncome +
      totals.bonusMoney +
      totals.receivedMoney +
      totals.expense,
    1
  );
  const expenseSourceTotal = Math.max(totals.expense, 1);
  const workIncome = totals.mainIncome + totals.bonusMoney;
  const previousWorkIncome =
    previousTotals.mainIncome + previousTotals.bonusMoney;
  const metrics: AiFinanceMetric[] = [
    buildMetric({
      currentValue: totals.net,
      detail: `Thu ${formatMoney(totals.totalIncome)} - chi ${formatMoney(
        totals.expense
      )}`,
      key: "net",
      label: "Tiền ròng",
      previousValue: previousTotals.net,
      sources: [
        buildMoneySource(
          "Tiền làm được",
          totals.mainIncome,
          netSourceTotal,
          "income"
        ),
        buildMoneySource(
          "Tiền thưởng",
          totals.bonusMoney,
          netSourceTotal,
          "income"
        ),
        buildMoneySource(
          "Tiền nhận",
          totals.receivedMoney,
          netSourceTotal,
          "income"
        ),
        buildMoneySource(
          "Chi tiêu",
          -totals.expense,
          netSourceTotal,
          "expense"
        ),
      ],
    }),
    buildMetric({
      currentValue: workIncome,
      detail: `Không tính tiền nhận riêng ${formatMoney(totals.receivedMoney)}`,
      key: "workIncome",
      label: "Tiền làm được",
      previousValue: previousWorkIncome,
      sources: [
        buildMoneySource(
          "Thu nhập công việc",
          totals.mainIncome,
          Math.max(workIncome, 1),
          "income"
        ),
        buildMoneySource(
          "Tiền thưởng",
          totals.bonusMoney,
          Math.max(workIncome, 1),
          "income"
        ),
      ],
    }),
    buildMetric({
      currentValue: averageExpense,
      detail: `Tổng ${formatMoney(totals.expense)} · tỷ lệ chi ${expenseRatio}%`,
      key: "expense",
      label: "Chi tiêu/ngày",
      positiveWhenUp: false,
      previousValue: previousAverageExpense,
      sources: [
        buildMoneySource(
          "Ăn uống",
          mealExpense,
          expenseSourceTotal,
          "expense"
        ),
        buildMoneySource(
          "Khoản khác",
          otherExpense,
          expenseSourceTotal,
          "expense"
        ),
      ],
    }),
    buildMetric({
      currentValue: topOtherExpense?.total ?? 0,
      detail: topOtherExpense ? topOtherExpense.label : "Chưa có khoản khác",
      key: "topOtherExpense",
      label: "Khoản khác lớn nhất",
      positiveWhenUp: false,
      previousValue: previousTopOtherExpense?.total ?? 0,
      sources: otherExpenseBreakdown.slice(0, 4).map((item) =>
        buildMoneySource(
          item.label,
          item.total,
          Math.max(otherExpense, 1),
          "expense"
        )
      ),
    }),
    buildMetric({
      currentValue: incomePerHour,
      detail: `${totals.workHours.toFixed(1)} giờ · ${totals.orderCount} đơn`,
      key: "incomePerHour",
      label: "Tiền/giờ",
      previousValue: previousIncomePerHour,
      sources: [
        {
          amount: totals.workHours,
          label: "Tổng giờ",
          share: 0,
          tone: "neutral",
          value: `${totals.workHours.toFixed(1)} giờ`,
        },
        {
          amount: totals.orderCount,
          label: "Tổng đơn",
          share: 0,
          tone: "neutral",
          value: `${totals.orderCount} đơn`,
        },
      ],
    }),
    buildMetric({
      changeFormatter: (value) => `${value} ngày`,
      currentValue: activeDays,
      detail: `${reachedDailyGoalDays} ngày đạt mục tiêu ngày`,
      formatter: (value) => `${value}/${dayCount}`,
      key: "activeDays",
      label: "Ngày có dữ liệu",
      previousValue: previousActiveDays,
      sources: [
        {
          amount: reachedDailyGoalDays,
          label: "Ngày đạt mục tiêu",
          share:
            dayCount > 0
              ? Math.round((reachedDailyGoalDays / dayCount) * 100)
              : 0,
          tone: "neutral",
          value: `${reachedDailyGoalDays} ngày`,
        },
        {
          amount: missingExpenseDays.length,
          label: "Ngày thiếu chi tiêu",
          share:
            dayCount > 0
              ? Math.round((missingExpenseDays.length / dayCount) * 100)
              : 0,
          tone: "expense",
          value: `${missingExpenseDays.length} ngày`,
        },
      ],
    }),
    buildMetric({
      currentValue: needPerDay,
      detail: "Mức ròng/ngày để bám mục tiêu lớn",
      key: "requiredPace",
      label: "Nhịp cần",
      previousValue: needPerDay,
      sources: [
        {
          amount: remainingGoalMoney,
          label: "Mục tiêu còn thiếu",
          share: 0,
          tone: "neutral",
          value: formatMoney(remainingGoalMoney),
        },
        {
          amount: goalDaysLeft,
          label: "Thời gian còn lại",
          share: 0,
          tone: "neutral",
          value: `${goalDaysLeft} ngày`,
        },
      ],
    }),
  ];

  return {
    actionPlan,
    actions: actions.slice(0, 4),
    anomalies,
    comparisonSummary,
    facts: {
      activeDays,
      averageExpense,
      averageNet,
      dayCount,
      expenseRatio,
      incomePerHour,
      needPerDay,
      orderCount: totals.orderCount,
      previousNet: previousTotals.net,
      totalExpense: totals.expense,
      totalIncome: totals.totalIncome,
      totalNet: totals.net,
      workHours: totals.workHours,
    },
    fromDate: selectedRange.fromDate,
    highlights: highlights.slice(0, 4),
    metrics,
    otherExpenseBreakdown: otherExpenseBreakdown.slice(0, 8),
    previousFromDate,
    previousToDate,
    rangeLabel: selectedRange.label,
    risks: risks.slice(0, 4),
    summary,
    title: "Trung tâm phân tích tài chính",
    toDate: selectedRange.toDate,
  };
}
