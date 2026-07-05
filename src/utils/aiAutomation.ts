import { DEFAULT_HUB_SETTINGS } from "../constants/hanoiHub";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../types";
import type { HubEntry, HubSettings } from "../types/hub";
import { addDaysToDateString, getDaysLeft } from "./date";
import {
  buildOtherExpenseBreakdown,
  getBonusMoney,
  getExpenseTotal,
  getMainIncome,
  getTotalEntryMoney,
  UNLABELED_OTHER_EXPENSE_LABEL,
} from "./entries";
import {
  buildHubAnalyticsRows,
  filterHubRowsByDate,
  getMonthRangeFromDate,
  getWeekRangeFromDate,
  groupHubPerformance,
  summarizeHubRows,
} from "./hubAnalytics";
import { formatMoney } from "./money";

export type AiAutomationInsights = {
  weeklyReport: string;
  monthlyReport: string;
  tomorrowPlan: string[];
  anomalies: string[];
  suggestedQuestions: string[];
};

type AiAutomationOptions = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  goals: Goals;
  today: string;
  hubEntries?: HubEntry[];
  hubSettings?: HubSettings;
};

type DayRow = {
  date: string;
  income: number;
  workIncome: number;
  expense: number;
  net: number;
  hours: number;
  orders: number;
};

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
  const rows: DayRow[] = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    const dayEntries = entries.filter((entry) => entry.date === cursor);
    const dayExpenses = expenses.filter((expense) => expense.date === cursor);
    const income = dayEntries.reduce(
      (sum, entry) => sum + getTotalEntryMoney(entry),
      0
    );
    const workIncome = dayEntries.reduce(
      (sum, entry) => sum + getMainIncome(entry) + getBonusMoney(entry),
      0
    );
    const expense = dayExpenses.reduce(
      (sum, item) => sum + getExpenseTotal(item),
      0
    );

    rows.push({
      date: cursor,
      income,
      workIncome,
      expense,
      net: income - expense,
      hours: dayEntries.reduce((sum, entry) => sum + entry.workHours, 0),
      orders: dayEntries.reduce(
        (sum, entry) => sum + (entry.orderCount ?? 0),
        0
      ),
    });

    cursor = addDaysToDateString(cursor, 1);
  }

  return rows;
}

function sumRows(rows: DayRow[]) {
  return rows.reduce(
    (sum, row) => ({
      income: sum.income + row.income,
      workIncome: sum.workIncome + row.workIncome,
      expense: sum.expense + row.expense,
      net: sum.net + row.net,
      hours: sum.hours + row.hours,
      orders: sum.orders + row.orders,
    }),
    {
      income: 0,
      workIncome: 0,
      expense: 0,
      net: 0,
      hours: 0,
      orders: 0,
    }
  );
}

function getActiveRows(rows: DayRow[]) {
  return rows.filter((row) => row.income > 0 || row.expense > 0);
}

function getAverage(value: number, count: number) {
  return count > 0 ? Math.round(value / count) : 0;
}

function getChangeText(current: number, previous: number) {
  const diff = current - previous;

  if (previous === 0) {
    if (current === 0) return "chưa có dữ liệu kỳ trước để so sánh";
    return `tăng ${formatMoney(current)} so với kỳ trước`;
  }

  const percent = Math.round((diff / Math.abs(previous)) * 100);

  if (diff >= 0) return `tăng ${formatMoney(diff)} (${percent}%)`;
  return `giảm ${formatMoney(Math.abs(diff))} (${Math.abs(percent)}%)`;
}

function getBestAndWorstDay(rows: DayRow[]) {
  const activeRows = getActiveRows(rows);

  return {
    best: [...activeRows].sort((a, b) => b.net - a.net)[0],
    worst: [...activeRows].sort((a, b) => a.net - b.net)[0],
  };
}

function getNeedPerDay({
  entries,
  expenses,
  goals,
}: Pick<AiAutomationOptions, "entries" | "expenses" | "goals">) {
  const income = entries.reduce((sum, entry) => {
    return sum + getTotalEntryMoney(entry);
  }, 0);
  const expense = expenses.reduce((sum, item) => {
    return sum + getExpenseTotal(item);
  }, 0);
  const currentMoney = goals.bigGoalSaved + income - expense;
  const remaining = Math.max(goals.bigGoalTarget - currentMoney, 0);
  const daysLeft = getDaysLeft(goals.bigGoalDeadline);

  return daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
}

function buildReport({
  entries,
  expenses,
  goals,
  hubEntries = [],
  hubSettings = DEFAULT_HUB_SETTINGS,
  previousFromDate,
  previousToDate,
  title,
  fromDate,
  toDate,
}: AiAutomationOptions & {
  title: string;
  fromDate: string;
  toDate: string;
  previousFromDate: string;
  previousToDate: string;
}) {
  const rows = buildRows({ entries, expenses, fromDate, toDate });
  const previousRows = buildRows({
    entries,
    expenses,
    fromDate: previousFromDate,
    toDate: previousToDate,
  });
  const totals = sumRows(rows);
  const previousTotals = sumRows(previousRows);
  const activeDays = getActiveRows(rows).length;
  const averageNet = getAverage(totals.net, Math.max(rows.length, 1));
  const incomePerHour =
    totals.hours > 0 ? Math.round(totals.workIncome / totals.hours) : 0;
  const { best, worst } = getBestAndWorstDay(rows);
  const hubRows = filterHubRowsByDate(
    buildHubAnalyticsRows(hubEntries, hubSettings),
    fromDate,
    toDate
  );
  const hubSummary = summarizeHubRows(hubRows);
  const bestHub = groupHubPerformance(hubRows, "hub", "workIncome")[0];
  const bestShift = groupHubPerformance(hubRows, "shift", "incomePerHour")[0];
  const otherExpenseBreakdown = buildOtherExpenseBreakdown(expenses, {
    fromDate,
    toDate,
  });
  const topOtherExpense = otherExpenseBreakdown[0];
  const needPerDay = getNeedPerDay({ entries, expenses, goals });
  const lines = [
    `${title} (${fromDate} đến ${toDate})`,
    `Thu ${formatMoney(totals.income)}, chi ${formatMoney(
      totals.expense
    )}, ròng ${formatMoney(totals.net)}.`,
    `So với kỳ trước: ${getChangeText(totals.net, previousTotals.net)}.`,
    `Trung bình ròng ${formatMoney(
      averageNet
    )}/ngày trên ${activeDays}/${rows.length} ngày có dữ liệu.`,
    `Tiền/giờ ${incomePerHour > 0 ? formatMoney(incomePerHour) : "chưa có"} · ${
      totals.hours
    } giờ · ${totals.orders} đơn.`,
  ];

  if (best) {
    lines.push(`Ngày tốt nhất: ${best.date}, ròng ${formatMoney(best.net)}.`);
  }

  if (worst) {
    lines.push(`Ngày yếu nhất: ${worst.date}, ròng ${formatMoney(worst.net)}.`);
  }

  if (hubSummary.shifts > 0) {
    lines.push(
      `Hub: ${hubSummary.shifts} ca, ${hubSummary.orders} đơn, làm thật ${formatMoney(
        hubSummary.workIncome
      )}.`
    );
  }

  if (bestHub) {
    lines.push(`Hub kiếm tốt nhất: ${bestHub.label}, ${formatMoney(bestHub.workIncome)}.`);
  }

  if (bestShift) {
    lines.push(
      `Ca hiệu quả nhất: ${bestShift.label}, ${formatMoney(
        bestShift.incomePerHour
      )}/giờ.`
    );
  }

  if (topOtherExpense) {
    lines.push(
      `Khoản khác lớn nhất: ${topOtherExpense.label}, ${formatMoney(
        topOtherExpense.total
      )} qua ${topOtherExpense.count} lần ghi.`
    );
  }

  if (averageNet < needPerDay && needPerDay > 0) {
    lines.push(
      `Khuyến nghị: cần tăng thêm khoảng ${formatMoney(
        needPerDay - averageNet
      )}/ngày hoặc giảm chi tương ứng để bám mục tiêu lớn.`
    );
  } else {
    lines.push("Khuyến nghị: giữ nhịp nhập dữ liệu đều và ưu tiên ca có tiền/giờ tốt.");
  }

  return lines.join("\n");
}

function buildTomorrowPlan(options: AiAutomationOptions) {
  const {
    entries,
    expenses,
    goals,
    hubEntries = [],
    hubSettings = DEFAULT_HUB_SETTINGS,
    today,
  } = options;
  const last7FromDate = addDaysToDateString(today, -6);
  const last30FromDate = addDaysToDateString(today, -29);
  const recentRows = buildRows({
    entries,
    expenses,
    fromDate: last7FromDate,
    toDate: today,
  });
  const recentTotals = sumRows(recentRows);
  const averageExpense = getAverage(recentTotals.expense, recentRows.length);
  const averageNet = getAverage(recentTotals.net, recentRows.length);
  const needPerDay = getNeedPerDay({ entries, expenses, goals });
  const targetNet = Math.max(needPerDay, goals.dailyIncome);
  const hubRows = filterHubRowsByDate(
    buildHubAnalyticsRows(hubEntries, hubSettings),
    last30FromDate,
    today
  );
  const bestShift = groupHubPerformance(hubRows, "shift", "incomePerHour")[0];
  const bestHub = groupHubPerformance(hubRows, "hub", "workIncome")[0];
  const topOtherExpense = buildOtherExpenseBreakdown(expenses, {
    fromDate: last7FromDate,
    toDate: today,
  })[0];
  const plan = [
    `Mốc tiền ròng nên nhắm ngày mai: ${formatMoney(targetNet)}.`,
    `Giữ chi tiêu dưới khoảng ${formatMoney(
      Math.max(Math.round(averageExpense * 0.9), 0)
    )} nếu muốn tốt hơn nhịp 7 ngày gần nhất.`,
  ];

  if (averageNet < needPerDay && needPerDay > 0) {
    plan.push(
      `Nhịp 7 ngày đang thiếu khoảng ${formatMoney(
        needPerDay - averageNet
      )}/ngày so với mục tiêu lớn.`
    );
  }

  if (bestShift) {
    plan.push(
      `Ưu tiên ca ${bestShift.label} vì trung bình ${formatMoney(
        bestShift.incomePerHour
      )}/giờ trong 30 ngày gần nhất.`
    );
  } else if (bestHub) {
    plan.push(`Ưu tiên ${bestHub.label} vì đang là Hub kiếm tốt nhất gần đây.`);
  } else {
    plan.push("Chưa đủ dữ liệu Hub để gợi ý ca, hãy nhập thêm vài ca làm.");
  }

  if (topOtherExpense) {
    plan.push(
      `Theo dõi riêng khoản ${topOtherExpense.label} vì 7 ngày gần nhất đã chi ${formatMoney(
        topOtherExpense.total
      )}.`
    );
  }

  plan.push("Cuối ngày nhớ chốt ca Hub, chi tiêu và kiểm kê để AI phân tích chính xác.");

  return plan;
}

function buildAnomalies(options: AiAutomationOptions) {
  const { entries, expenses, balanceChecks, today } = options;
  const todayRows = buildRows({ entries, expenses, fromDate: today, toDate: today });
  const todayRow = todayRows[0];
  const previousRows = buildRows({
    entries,
    expenses,
    fromDate: addDaysToDateString(today, -30),
    toDate: addDaysToDateString(today, -1),
  });
  const activePreviousRows = getActiveRows(previousRows);
  const previousTotals = sumRows(activePreviousRows);
  const averageExpense = getAverage(
    previousTotals.expense,
    Math.max(activePreviousRows.length, 1)
  );
  const averageIncomePerHour =
    previousTotals.hours > 0
      ? Math.round(previousTotals.workIncome / previousTotals.hours)
      : 0;
  const todayIncomePerHour =
    todayRow.hours > 0 ? Math.round(todayRow.workIncome / todayRow.hours) : 0;
  const todayEntry = entries.find((entry) => entry.date === today);
  const todayExpense = expenses.find((expense) => expense.date === today);
  const todayOtherExpenseBreakdown = buildOtherExpenseBreakdown(expenses, {
    fromDate: today,
    toDate: today,
  });
  const todayBalanceCheck = balanceChecks.find((item) => item.date === today);
  const latestBalanceCheck = [...balanceChecks].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];
  const anomalies: string[] = [];

  if (!todayEntry) anomalies.push("Hôm nay chưa có nhật ký hoặc ca Hub.");
  if (!todayExpense) anomalies.push("Hôm nay chưa có chi tiêu.");
  if (!todayBalanceCheck) anomalies.push("Hôm nay chưa kiểm kê số dư.");

  if (averageExpense > 0 && todayRow.expense > averageExpense * 1.5) {
    anomalies.push(
      `Chi tiêu hôm nay ${formatMoney(
        todayRow.expense
      )} cao hơn nhiều so với trung bình ${formatMoney(averageExpense)}.`
    );
  }

  if (
    todayIncomePerHour > 0 &&
    averageIncomePerHour > 0 &&
    todayIncomePerHour < averageIncomePerHour * 0.75
  ) {
    anomalies.push(
      `Tiền/giờ hôm nay ${formatMoney(
        todayIncomePerHour
      )} thấp hơn mức gần đây ${formatMoney(averageIncomePerHour)}.`
    );
  }

  if (latestBalanceCheck && Math.abs(latestBalanceCheck.difference) >= 50000) {
    anomalies.push(
      `Kiểm kê gần nhất lệch ${formatMoney(
        latestBalanceCheck.difference
      )}, nên đối chiếu lại tiền mặt/tài khoản.`
    );
  }

  if (todayRow.income > 0 && todayRow.expense === 0) {
    anomalies.push("Có thu nhập hôm nay nhưng chi tiêu bằng 0, cần kiểm tra có quên nhập chi không.");
  }

  if (
    todayOtherExpenseBreakdown.some(
      (item) => item.label === UNLABELED_OTHER_EXPENSE_LABEL
    )
  ) {
    anomalies.push("Hôm nay có khoản khác chưa gắn nhãn.");
  }

  return anomalies.length > 0
    ? anomalies
    : ["Chưa phát hiện bất thường rõ ràng trong dữ liệu hiện tại."];
}

export function buildAiAutomationInsights(
  options: AiAutomationOptions
): AiAutomationInsights {
  const thisWeek = getWeekRangeFromDate(options.today);
  const previousWeek = getWeekRangeFromDate(options.today, -1);
  const thisMonth = getMonthRangeFromDate(options.today);
  const previousMonth = getMonthRangeFromDate(options.today, -1);

  return {
    weeklyReport: buildReport({
      ...options,
      title: "Báo cáo tuần này",
      fromDate: thisWeek.fromDate,
      toDate: thisWeek.toDate,
      previousFromDate: previousWeek.fromDate,
      previousToDate: previousWeek.toDate,
    }),
    monthlyReport: buildReport({
      ...options,
      title: "Báo cáo tháng này",
      fromDate: thisMonth.fromDate,
      toDate: thisMonth.toDate,
      previousFromDate: previousMonth.fromDate,
      previousToDate: previousMonth.toDate,
    }),
    tomorrowPlan: buildTomorrowPlan(options),
    anomalies: buildAnomalies(options),
    suggestedQuestions: [
      "Tuần này Hub nào kiếm tốt nhất?",
      "Ca nào hiệu quả nhất gần đây?",
      "Vì sao tháng này chậm mục tiêu?",
      "Chi tiêu có đang cao bất thường không?",
      "Khoản khác nào tốn nhất tuần này?",
    ],
  };
}

function normalizeQuestion(question: string) {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function answerAiFinanceQuestion({
  question,
  ...options
}: AiAutomationOptions & { question: string }) {
  const normalized = normalizeQuestion(question);
  const hubRows = buildHubAnalyticsRows(
    options.hubEntries ?? [],
    options.hubSettings ?? DEFAULT_HUB_SETTINGS
  );
  const thisWeek = getWeekRangeFromDate(options.today);
  const thisMonth = getMonthRangeFromDate(options.today);

  if (normalized.includes("hub") && normalized.includes("tot")) {
    const rows = filterHubRowsByDate(
      hubRows,
      thisWeek.fromDate,
      thisWeek.toDate
    );
    const bestHub = groupHubPerformance(rows, "hub", "workIncome")[0];

    return bestHub
      ? `Tuần này ${bestHub.label} kiếm tốt nhất: ${formatMoney(
          bestHub.workIncome
        )}, ${bestHub.shifts} ca, ${bestHub.orders} đơn, trung bình ${formatMoney(
          bestHub.incomePerHour
        )}/giờ.`
      : "Tuần này chưa có dữ liệu Hub đủ để xếp hạng.";
  }

  if (normalized.includes("ca") && normalized.includes("hieu qua")) {
    const rows = filterHubRowsByDate(
      hubRows,
      addDaysToDateString(options.today, -29),
      options.today
    );
    const bestShift = groupHubPerformance(rows, "shift", "incomePerHour")[0];

    return bestShift
      ? `Ca hiệu quả nhất gần đây là ${bestShift.label}: ${formatMoney(
          bestShift.incomePerHour
        )}/giờ, ${bestShift.shifts} ca, làm thật ${formatMoney(
          bestShift.workIncome
        )}.`
      : "Chưa có đủ dữ liệu ca Hub để so sánh tiền/giờ.";
  }

  if (normalized.includes("cham") || normalized.includes("deadline")) {
    const monthRows = buildRows({
      entries: options.entries,
      expenses: options.expenses,
      fromDate: thisMonth.fromDate,
      toDate: thisMonth.toDate,
    });
    const totals = sumRows(monthRows);
    const averageNet = getAverage(totals.net, monthRows.length);
    const needPerDay = getNeedPerDay(options);

    return averageNet < needPerDay
      ? `Tháng này đang chậm vì trung bình ròng ${formatMoney(
          averageNet
        )}/ngày thấp hơn nhịp cần ${formatMoney(
          needPerDay
        )}/ngày. Cần tăng thêm khoảng ${formatMoney(
          needPerDay - averageNet
        )}/ngày hoặc giảm chi tương ứng.`
      : `Tháng này chưa chậm mục tiêu theo nhịp hiện tại: trung bình ròng ${formatMoney(
          averageNet
        )}/ngày so với nhịp cần ${formatMoney(needPerDay)}/ngày.`;
  }

  if (normalized.includes("chi") || normalized.includes("tieu")) {
    const rows = buildRows({
      entries: options.entries,
      expenses: options.expenses,
      fromDate: addDaysToDateString(options.today, -6),
      toDate: options.today,
    });
    const totals = sumRows(rows);
    const averageExpense = getAverage(totals.expense, rows.length);
    const highestExpenseDay = [...rows].sort((a, b) => b.expense - a.expense)[0];
    const otherExpenseBreakdown = buildOtherExpenseBreakdown(options.expenses, {
      fromDate: addDaysToDateString(options.today, -6),
      toDate: options.today,
    });
    const topOtherText =
      otherExpenseBreakdown.length > 0
        ? ` Khoản khác lớn nhất là ${otherExpenseBreakdown[0].label}: ${formatMoney(
            otherExpenseBreakdown[0].total
          )}.`
        : "";

    return `7 ngày gần nhất chi trung bình ${formatMoney(
      averageExpense
    )}/ngày. Ngày chi cao nhất là ${highestExpenseDay.date}: ${formatMoney(
      highestExpenseDay.expense
    )}.${topOtherText}`;
  }

  const insights = buildAiAutomationInsights(options);

  return [
    "Mình chưa nhận diện được đúng ý câu hỏi, đây là tóm tắt nhanh:",
    insights.weeklyReport.split("\n").slice(1, 4).join("\n"),
    "Bạn có thể hỏi: Tuần này Hub nào kiếm tốt nhất? Ca nào hiệu quả nhất gần đây? Vì sao tháng này chậm mục tiêu?",
  ].join("\n");
}
