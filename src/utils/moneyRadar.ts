import type { BalanceCheckEntry, DailyEntry, ExpenseEntry } from "../types";
import { addDaysToDateString } from "./date";
import { getExpenseTotal, getOtherExpenseItems, getTotalEntryMoney } from "./entries";

export type MoneyRadarSeverity = "ok" | "info" | "warning" | "danger";

export type MoneyRadarAlert = {
  id: string;
  severity: MoneyRadarSeverity;
  title: string;
  description: string;
};

export type MoneyRadarDailyAudit = {
  date: string;
  appMoney: number;
  actualMoney: number;
  cash: number;
  bank: number;
  difference: number;
  income: number;
  expense: number;
  hasOtherExpense: boolean;
  status: MoneyRadarSeverity;
  statusText: string;
};

export type MoneyRadar = {
  status: MoneyRadarSeverity;
  statusText: string;
  appMoney: number;
  actualMoney: number | null;
  cash: number | null;
  bank: number | null;
  negativeWalletDebt: number;
  todayIncome: number;
  todayExpense: number;
  todayDifference: number | null;
  latestDifference: number | null;
  uncheckedRecentDays: number;
  dailyAudits: MoneyRadarDailyAudit[];
  alerts: MoneyRadarAlert[];
};

type BuildMoneyRadarOptions = {
  appMoney: number;
  balanceChecks: BalanceCheckEntry[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  negativeWallet: number;
  today: string;
};

function getDayIncome(entries: DailyEntry[], date: string) {
  return entries
    .filter((entry) => entry.date === date)
    .reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0);
}

function getDayExpense(expenses: ExpenseEntry[], date: string) {
  return expenses
    .filter((expense) => expense.date === date)
    .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
}

function hasOtherExpense(expenses: ExpenseEntry[], date: string) {
  return expenses.some((expense) => {
    return expense.date === date && getOtherExpenseItems(expense).length > 0;
  });
}

function getLargeDifferenceThreshold(appMoney: number) {
  return Math.max(50000, Math.round(Math.abs(appMoney) * 0.03));
}

function getRecentDates(today: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    addDaysToDateString(today, -index)
  );
}

function getStatus(alerts: MoneyRadarAlert[]): MoneyRadarSeverity {
  if (alerts.some((alert) => alert.severity === "danger")) return "danger";
  if (alerts.some((alert) => alert.severity === "warning")) return "warning";
  if (alerts.some((alert) => alert.severity === "info")) return "info";

  return "ok";
}

function getStatusText(status: MoneyRadarSeverity, alerts: MoneyRadarAlert[]) {
  if (status === "danger") return alerts.find((alert) => alert.severity === "danger")?.title ?? "Có lệch tiền lớn";
  if (status === "warning") return alerts.find((alert) => alert.severity === "warning")?.title ?? "Cần kiểm tra tiền";
  if (status === "info") return alerts.find((alert) => alert.severity === "info")?.title ?? "Có điểm cần theo dõi";

  return "Chưa thấy lệch tiền đáng kể";
}

function getAuditStatus(check: BalanceCheckEntry): MoneyRadarSeverity {
  const threshold = getLargeDifferenceThreshold(check.appMoney);

  if (check.difference <= -threshold) return "danger";
  if (Math.abs(check.difference) >= threshold) return "warning";
  if (Math.abs(check.difference) > 0) return "info";

  return "ok";
}

function getAuditStatusText(status: MoneyRadarSeverity, difference: number) {
  if (status === "danger") {
    return `Thiếu ${Math.abs(difference).toLocaleString("vi-VN")} đ`;
  }

  if (status === "warning" && difference > 0) {
    return `Dư ${difference.toLocaleString("vi-VN")} đ`;
  }

  if (status === "warning") {
    return `Lệch ${Math.abs(difference).toLocaleString("vi-VN")} đ`;
  }

  if (status === "info") {
    return `Lệch nhẹ ${difference.toLocaleString("vi-VN")} đ`;
  }

  return "Khớp";
}

export function buildMoneyRadar({
  appMoney,
  balanceChecks,
  entries,
  expenses,
  negativeWallet,
  today,
}: BuildMoneyRadarOptions): MoneyRadar {
  const sortedChecks = [...balanceChecks].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const todayCheck = balanceChecks.find((item) => item.date === today);
  const latestCheck = sortedChecks[0];
  const activeRecentDates = getRecentDates(today, 7).filter((date) => {
    return getDayIncome(entries, date) > 0 || getDayExpense(expenses, date) > 0;
  });
  const uncheckedRecentDays = activeRecentDates.filter((date) => {
    return !balanceChecks.some((item) => item.date === date);
  }).length;
  const negativeWalletDebt = Math.abs(Math.min(negativeWallet, 0));
  const todayIncome = getDayIncome(entries, today);
  const todayExpense = getDayExpense(expenses, today);
  const dailyAudits = sortedChecks.map((check) => {
    const status = getAuditStatus(check);

    return {
      date: check.date,
      appMoney: check.appMoney,
      actualMoney: check.actualMoney,
      cash: check.cash,
      bank: check.bank,
      difference: check.difference,
      income: getDayIncome(entries, check.date),
      expense: getDayExpense(expenses, check.date),
      hasOtherExpense: hasOtherExpense(expenses, check.date),
      status,
      statusText: getAuditStatusText(status, check.difference),
    };
  });
  const alerts: MoneyRadarAlert[] = [];

  if (todayCheck) {
    const threshold = getLargeDifferenceThreshold(todayCheck.appMoney);

    if (todayCheck.difference <= -threshold) {
      alerts.push({
        id: "today-missing-money",
        severity: "danger",
        title: `Hôm nay có khả năng thiếu ${Math.abs(
          todayCheck.difference
        ).toLocaleString("vi-VN")} đ chưa ghi.`,
        description:
          "Tiền thực tế thấp hơn tiền app tính. Nên kiểm tra lại chi tiêu, tiền âm ví app hoặc khoản bị bỏ sót.",
      });
    } else if (todayCheck.difference >= threshold) {
      alerts.push({
        id: "today-extra-money",
        severity: "warning",
        title: `Hôm nay thực tế đang dư ${todayCheck.difference.toLocaleString(
          "vi-VN"
        )} đ so với app tính.`,
        description:
          "Có thể có khoản nhận thêm hoặc thu nhập chưa được ghi vào nhật ký.",
      });
    }
  } else {
    alerts.push({
      id: "today-no-balance-check",
      severity: "warning",
      title: "Hôm nay chưa kiểm kê số dư.",
      description:
        "App chưa có tiền ví thật và tiền tài khoản hôm nay để đối chiếu với tiền app tính.",
    });
  }

  if (latestCheck && latestCheck.date !== today) {
    alerts.push({
      id: "latest-check-old",
      severity: "info",
      title: `Lần kiểm kê gần nhất là ${latestCheck.date}.`,
      description:
        "Nếu hôm nay đã có thu nhập hoặc chi tiêu, số liệu mục tiêu có thể chưa phản ánh đúng tiền thật.",
    });
  }

  if (uncheckedRecentDays >= 3) {
    alerts.push({
      id: "unchecked-recent-days",
      severity: "warning",
      title: `Bạn có ${uncheckedRecentDays} ngày gần đây chưa kiểm kê.`,
      description:
        "Số liệu mục tiêu có thể sai lệch nếu nhiều ngày liên tiếp không đối chiếu tiền thật.",
    });
  }

  const recentLargeDifferences = sortedChecks
    .filter((check) => check.date >= addDaysToDateString(today, -29))
    .filter((check) => Math.abs(check.difference) >= getLargeDifferenceThreshold(check.appMoney));
  const otherExpenseLinkedDifferences = recentLargeDifferences.filter((check) => {
    return (
      hasOtherExpense(expenses, check.date) ||
      hasOtherExpense(expenses, addDaysToDateString(check.date, -1))
    );
  });

  if (otherExpenseLinkedDifferences.length >= 2) {
    alerts.push({
      id: "other-expense-linked-difference",
      severity: "info",
      title: "Khoản lệch thường xuất hiện quanh ngày có chi tiêu khác.",
      description:
        "Nên kiểm tra kỹ các khoản xăng, tiền điện, phát sinh hoặc nhãn khác trong những ngày bị lệch.",
    });
  }

  if (negativeWalletDebt > 0) {
    alerts.push({
      id: "negative-wallet",
      severity: "info",
      title: `Ví app đang âm ${negativeWalletDebt.toLocaleString("vi-VN")} đ.`,
      description:
        "Khi so với mốc cần về, nên trừ khoản âm ví app để tránh tưởng rằng đã đủ tiền.",
    });
  }

  if (todayIncome > 0 && todayExpense === 0) {
    alerts.push({
      id: "income-no-expense",
      severity: "info",
      title: "Hôm nay có thu nhập nhưng chưa thấy chi tiêu.",
      description:
        "Nếu đã ăn uống, đổ xăng hoặc phát sinh chi phí, hãy nhập để tiền ròng không bị đẹp hơn thực tế.",
    });
  }

  const status = getStatus(alerts);

  return {
    status,
    statusText: getStatusText(status, alerts),
    appMoney: todayCheck?.appMoney ?? latestCheck?.appMoney ?? appMoney,
    actualMoney: todayCheck?.actualMoney ?? latestCheck?.actualMoney ?? null,
    cash: todayCheck?.cash ?? latestCheck?.cash ?? null,
    bank: todayCheck?.bank ?? latestCheck?.bank ?? null,
    negativeWalletDebt,
    todayIncome,
    todayExpense,
    todayDifference: todayCheck?.difference ?? null,
    latestDifference: latestCheck?.difference ?? null,
    uncheckedRecentDays,
    dailyAudits,
    alerts:
      alerts.length > 0
        ? alerts
        : [
            {
              id: "money-radar-ok",
              severity: "ok",
              title: "Tiền đang khớp ở mức ổn.",
              description:
                "Chưa phát hiện khoản lệch lớn từ kiểm kê, thu nhập và chi tiêu đã ghi.",
            },
          ],
  };
}
