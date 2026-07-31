import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
  SubGoal,
} from "../../types";
import type { HubEntry, HubSettings } from "../../types/hub";
import {
  calculateAccountBalanceAtDate,
  type AccountTransaction,
  type FinancialAccount,
} from "../account-ledger/accountLedgerModel";
import type { AccountReconciliation } from "../account-reconciliation/accountReconciliationModel";
import { getExpenseTotal, getTotalEntryMoney } from "../../utils/entries";
import { getSubGoalSaved } from "../../utils/goals";
import {
  calculateHubIncome,
  calculateHubIncomeByEntry,
} from "../../utils/hubIncome";
import { getHubShiftHours } from "../../utils/hubProfitCore";

export type DataHealthCategory =
  | "duplicates"
  | "hub"
  | "journal"
  | "accounts"
  | "goals";

export type DataHealthSeverity = "error" | "warning";

export type DataHealthIssueAction =
  | { kind: "journal"; date: string; recordId?: string }
  | { kind: "expense"; date: string; recordId?: string }
  | { kind: "balanceCheck"; date: string; recordId?: string }
  | { kind: "hub"; date: string; entryId: string }
  | { kind: "reconciliation"; date: string; checkId?: string }
  | {
      kind: "goal";
      goalId?: string;
      screen: "current" | "subGoals" | "completed";
    };

export type DataHealthFact = {
  label: string;
  value: string;
};

export type DataHealthIssue = {
  action: DataHealthIssueAction;
  actionLabel: string;
  category: DataHealthCategory;
  cause: string;
  date?: string;
  facts: DataHealthFact[];
  id: string;
  resolution: string;
  severity: DataHealthSeverity;
  summary: string;
  title: string;
};

export type DataHealthReport = {
  checkedByCategory: Record<DataHealthCategory, number>;
  generatedAt: string;
  issues: DataHealthIssue[];
};

export type DataHealthInput = {
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
  reconciliations: AccountReconciliation[];
};

export const DATA_HEALTH_CATEGORY_META: Record<
  DataHealthCategory,
  { label: string; description: string }
> = {
  duplicates: {
    label: "Bản ghi trùng",
    description: "Nhật ký, chi tiêu và kiểm kê chỉ nên có một bản ghi mỗi ngày.",
  },
  hub: {
    label: "Công thức Hub",
    description: "Đối chiếu tiền ca đã lưu với công thức Hub hiện tại.",
  },
  journal: {
    label: "Nhật ký và ca",
    description: "Tìm ngày thiếu dữ liệu Hub, số đơn hoặc giờ làm.",
  },
  accounts: {
    label: "Tài khoản",
    description: "So sánh Sổ tài khoản với lần kiểm kê gần nhất.",
  },
  goals: {
    label: "Mục tiêu",
    description: "Tính lại tiền tích lũy từ dữ liệu gốc và lịch sử góp tiền.",
  },
};

const MONEY_TOLERANCE = 1;
const HOURS_TOLERANCE = 0.05;

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoneyValue(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value)} đ`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function isFiniteNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value);
}

function sum<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function groupByDate<T extends { date: string }>(items: T[]) {
  const groups = new Map<string, T[]>();

  items.forEach((item) => {
    const group = groups.get(item.date) ?? [];
    group.push(item);
    groups.set(item.date, group);
  });

  return groups;
}

function addDuplicateDateIssues<T extends { date: string; id: string }>(
  issues: DataHealthIssue[],
  items: T[],
  config: {
    action: (item: T) => DataHealthIssueAction;
    label: string;
    source: string;
  }
) {
  groupByDate(items).forEach((records, date) => {
    if (records.length < 2) return;

    issues.push({
      action: config.action(records[0]),
      actionLabel: "Mở và hợp nhất",
      category: "duplicates",
      cause: `${records.length} bản ghi ${config.source} đang cùng dùng ngày ${formatDate(
        date
      )}. Các màn hình tổng hợp có thể chỉ đọc một bản ghi hoặc cộng lặp dữ liệu.`,
      date,
      facts: [
        { label: "Số bản ghi", value: String(records.length) },
        { label: "Ngày bị trùng", value: formatDate(date) },
      ],
      id: `duplicate:${config.source}:${date}`,
      resolution:
        "Mở bản ghi, kiểm tra giá trị đúng rồi lưu lại. Form hiện tại sẽ thay các bản ghi cùng ngày bằng một bản ghi duy nhất.",
      severity: "error",
      summary: `${records.length} ${config.label.toLocaleLowerCase("vi-VN")} cùng ngày có thể làm số liệu bị cộng lặp.`,
      title: `${config.label} bị trùng ngày ${formatDate(date)}`,
    });
  });
}

function buildDuplicateIssues(input: DataHealthInput) {
  const issues: DataHealthIssue[] = [];

  addDuplicateDateIssues(issues, input.entries, {
    action: (entry) => ({
      date: entry.date,
      kind: "journal",
      recordId: entry.id,
    }),
    label: "Nhật ký",
    source: "journal",
  });
  addDuplicateDateIssues(issues, input.expenses, {
    action: (expense) => ({
      date: expense.date,
      kind: "expense",
      recordId: expense.id,
    }),
    label: "Chi tiêu",
    source: "expense",
  });
  addDuplicateDateIssues(issues, input.balanceChecks, {
    action: (check) => ({
      date: check.date,
      kind: "balanceCheck",
      recordId: check.id,
    }),
    label: "Kiểm kê số dư",
    source: "balance-check",
  });
  addDuplicateDateIssues(issues, input.reconciliations, {
    action: (check) => ({
      checkId: check.id,
      date: check.date,
      kind: "reconciliation",
    }),
    label: "Kiểm kê tài khoản",
    source: "account-reconciliation",
  });

  return issues;
}

function buildHubIssues(input: DataHealthInput) {
  const issues: DataHealthIssue[] = [];
  const incomeByEntry = calculateHubIncomeByEntry(
    input.hubEntries,
    input.hubSettings
  );

  input.hubEntries.forEach((entry) => {
    const income =
      incomeByEntry.get(entry.id) ??
      calculateHubIncome(entry, input.hubSettings);
    const expectedIncome = income.workIncome;
    const recordedIncome = entry.diaryIncomeAmount;

    if (income.overusedOrderCount > 0) {
      issues.push({
        action: { date: entry.date, entryId: entry.id, kind: "hub" },
        actionLabel: "Sửa ca Hub",
        category: "hub",
        cause:
          "Số đơn con đã dùng cho các lượt ghép lớn hơn tổng số đơn của ca, nên tiền đơn lẻ và tiền ghép không thể được tính nhất quán.",
        date: entry.date,
        facts: [
          { label: "Tổng đơn", value: String(entry.order) },
          {
            label: "Đơn trong lượt ghép",
            value: String(income.totalJoinChildOrders),
          },
          { label: "Vượt", value: String(income.overusedOrderCount) },
        ],
        id: `hub:overused-orders:${entry.id}`,
        resolution:
          "Giảm số lượng lượt ghép hoặc tăng tổng số đơn của ca cho đến khi số đơn đã ghép không vượt tổng đơn.",
        severity: "error",
        summary: `Ca có ${entry.order} đơn nhưng các lượt ghép đang sử dụng ${income.totalJoinChildOrders} đơn.`,
        title: `Ca Hub ngày ${formatDate(entry.date)} dùng quá số đơn`,
      });
    }

    if (recordedIncome === undefined) {
      issues.push({
        action: { date: entry.date, entryId: entry.id, kind: "hub" },
        actionLabel: "Cập nhật ca Hub",
        category: "hub",
        cause:
          "Ca được tạo từ phiên bản cũ và chưa lưu số tiền đã chuyển sang nhật ký để đối chiếu với công thức hiện tại.",
        date: entry.date,
        facts: [
          { label: "Công thức hiện tại", value: formatMoneyValue(expectedIncome) },
          { label: "Tiền đã ghi", value: "Chưa có dữ liệu" },
        ],
        id: `hub:missing-recorded-income:${entry.id}`,
        resolution:
          "Mở ca và lưu cập nhật một lần. Ứng dụng sẽ ghi lại phần tiền làm được theo công thức mới.",
        severity: "warning",
        summary: "Ca Hub chưa có giá trị tiền nhật ký để xác minh công thức.",
        title: `Ca Hub ngày ${formatDate(entry.date)} thiếu dữ liệu đối chiếu`,
      });
    } else if (Math.abs(recordedIncome - expectedIncome) >= MONEY_TOLERANCE) {
      issues.push({
        action: { date: entry.date, entryId: entry.id, kind: "hub" },
        actionLabel: "Sửa ca Hub",
        category: "hub",
        cause:
          "Tiền làm được đã lưu trong ca khác kết quả tính lại từ số đơn, đơn ghép, loại Hub và các thiết lập thưởng hiện tại.",
        date: entry.date,
        facts: [
          { label: "Đã lưu", value: formatMoneyValue(recordedIncome) },
          { label: "Theo công thức", value: formatMoneyValue(expectedIncome) },
          {
            label: "Chênh lệch",
            value: formatMoneyValue(recordedIncome - expectedIncome),
          },
        ],
        id: `hub:income-mismatch:${entry.id}`,
        resolution:
          "Mở ca, kiểm tra số đơn và đơn ghép rồi lưu cập nhật để đồng bộ lại tiền làm được trong nhật ký.",
        severity: "error",
        summary: `${formatMoneyValue(recordedIncome)} đã lưu, trong khi công thức hiện tại cho ra ${formatMoneyValue(expectedIncome)}.`,
        title: `Tổng tiền ca Hub ngày ${formatDate(entry.date)} không khớp`,
      });
    }
  });

  return issues;
}

function buildJournalIssues(input: DataHealthInput) {
  const issues: DataHealthIssue[] = [];
  const entriesByDate = groupByDate(input.entries);
  const hubsByDate = groupByDate(input.hubEntries);
  const incomeByEntry = calculateHubIncomeByEntry(
    input.hubEntries,
    input.hubSettings
  );

  hubsByDate.forEach((hubEntries, date) => {
    const journalEntries = entriesByDate.get(date) ?? [];
    const expectedIncome = sum(hubEntries, (entry) => {
      return (
        incomeByEntry.get(entry.id) ??
        calculateHubIncome(entry, input.hubSettings)
      ).workIncome;
    });
    const expectedOrders = sum(hubEntries, (entry) => entry.order);
    const expectedHours = sum(hubEntries, (entry) =>
      getHubShiftHours(entry.shiftName)
    );

    if (journalEntries.length === 0) {
      issues.push({
        action: { date, kind: "journal" },
        actionLabel: "Tạo nhật ký",
        category: "journal",
        cause:
          "Ngày này có dữ liệu ca Hub nhưng không có bản ghi nhật ký tương ứng, nên lịch sử và tiến độ mục tiêu có thể bỏ sót thu nhập.",
        date,
        facts: [
          { label: "Số ca Hub", value: String(hubEntries.length) },
          { label: "Tiền cần ghi", value: formatMoneyValue(expectedIncome) },
          { label: "Giờ cần ghi", value: `${formatNumber(expectedHours)} giờ` },
        ],
        id: `journal:missing:${date}`,
        resolution:
          "Tạo nhật ký cho ngày này hoặc mở từng ca Hub và lưu lại để khôi phục phần đóng góp vào nhật ký.",
        severity: "error",
        summary: `${hubEntries.length} ca Hub chưa có nhật ký ngày tương ứng.`,
        title: `Thiếu nhật ký cho ngày ${formatDate(date)}`,
      });
      return;
    }

    const recordedIncome = sum(journalEntries, (entry) => entry.income ?? 0);
    const recordedOrders = sum(
      journalEntries,
      (entry) => entry.orderCount ?? 0
    );
    const recordedHours = sum(
      journalEntries,
      (entry) => entry.workHours ?? 0
    );
    const firstEntry = journalEntries[0];

    if (recordedIncome + MONEY_TOLERANCE < expectedIncome) {
      issues.push({
        action: {
          date,
          kind: "journal",
          recordId: firstEntry.id,
        },
        actionLabel: "Sửa nhật ký",
        category: "journal",
        cause:
          "Tổng tiền làm được trong nhật ký thấp hơn tổng tiền làm được từ các ca Hub của cùng ngày.",
        date,
        facts: [
          { label: "Nhật ký", value: formatMoneyValue(recordedIncome) },
          { label: "Từ Hub", value: formatMoneyValue(expectedIncome) },
          {
            label: "Còn thiếu",
            value: formatMoneyValue(expectedIncome - recordedIncome),
          },
        ],
        id: `journal:income-shortage:${date}`,
        resolution:
          "Mở nhật ký để kiểm tra tiền làm được, hoặc cập nhật lại ca Hub nếu số đơn của ca đang sai.",
        severity: "error",
        summary: `Nhật ký đang thiếu ${formatMoneyValue(expectedIncome - recordedIncome)} so với Hub.`,
        title: `Nhật ký ngày ${formatDate(date)} thiếu tiền ca`,
      });
    }

    if (recordedOrders < expectedOrders) {
      issues.push({
        action: { date, kind: "journal", recordId: firstEntry.id },
        actionLabel: "Sửa nhật ký",
        category: "journal",
        cause:
          "Số đơn trong nhật ký thấp hơn tổng số đơn của các ca Hub cùng ngày. Có thể một ca chưa được cộng vào nhật ký.",
        date,
        facts: [
          { label: "Nhật ký", value: `${recordedOrders} đơn` },
          { label: "Từ Hub", value: `${expectedOrders} đơn` },
        ],
        id: `journal:orders-shortage:${date}`,
        resolution:
          "Kiểm tra các ca trong ngày và cập nhật lại số đơn của nhật ký cho đúng tổng.",
        severity: "warning",
        summary: `Nhật ký có ${recordedOrders}/${expectedOrders} đơn từ Hub.`,
        title: `Nhật ký ngày ${formatDate(date)} có thể thiếu ca`,
      });
    }

    if (recordedHours + HOURS_TOLERANCE < expectedHours) {
      issues.push({
        action: { date, kind: "journal", recordId: firstEntry.id },
        actionLabel: "Bổ sung giờ làm",
        category: "journal",
        cause:
          "Số giờ trong nhật ký thấp hơn tổng thời lượng của các khung giờ Hub đã lưu trong ngày.",
        date,
        facts: [
          { label: "Nhật ký", value: `${formatNumber(recordedHours)} giờ` },
          { label: "Từ ca Hub", value: `${formatNumber(expectedHours)} giờ` },
        ],
        id: `journal:hours-shortage:${date}`,
        resolution:
          "Mở nhật ký và bổ sung giờ làm, hoặc sửa khung giờ của ca Hub nếu ca đã chọn chưa đúng.",
        severity: "warning",
        summary: `Nhật ký có ${formatNumber(recordedHours)}/${formatNumber(expectedHours)} giờ từ Hub.`,
        title: `Nhật ký ngày ${formatDate(date)} thiếu giờ làm`,
      });
    }
  });

  input.entries.forEach((entry) => {
    const hasWork = (entry.income ?? 0) > 0 || (entry.orderCount ?? 0) > 0;
    const hasHub = (hubsByDate.get(entry.date)?.length ?? 0) > 0;

    if (hasWork && (entry.workHours ?? 0) <= 0) {
      issues.push({
        action: { date: entry.date, kind: "journal", recordId: entry.id },
        actionLabel: "Bổ sung giờ làm",
        category: "journal",
        cause:
          "Nhật ký có tiền làm được hoặc số đơn nhưng số giờ làm đang bằng 0. Các thống kê tiền/giờ sẽ không chính xác.",
        date: entry.date,
        facts: [
          { label: "Tiền làm được", value: formatMoneyValue(entry.income ?? 0) },
          { label: "Số đơn", value: String(entry.orderCount ?? 0) },
          { label: "Giờ làm", value: "0 giờ" },
        ],
        id: `journal:zero-hours:${entry.id}`,
        resolution: "Mở nhật ký và nhập tổng số giờ đã làm trong ngày.",
        severity: "warning",
        summary: "Có dữ liệu công việc nhưng chưa ghi số giờ làm.",
        title: `Nhật ký ngày ${formatDate(entry.date)} chưa có giờ làm`,
      });
    }

    if (!hasHub && (entry.orderCount ?? 0) > 0) {
      issues.push({
        action: { date: entry.date, kind: "journal", recordId: entry.id },
        actionLabel: "Kiểm tra nhật ký",
        category: "journal",
        cause:
          "Nhật ký có số đơn nhưng không tìm thấy ca Hub cùng ngày. Ca có thể chưa được lưu hoặc nhật ký đang chứa số đơn nhập thủ công.",
        date: entry.date,
        facts: [
          { label: "Số đơn nhật ký", value: String(entry.orderCount ?? 0) },
          { label: "Ca Hub", value: "0 ca" },
        ],
        id: `journal:no-hub:${entry.id}`,
        resolution:
          "Nếu đây là đơn Hub, hãy thêm ca còn thiếu. Nếu là công việc khác, giữ nguyên và kiểm tra lại ghi chú để phân biệt nguồn.",
        severity: "warning",
        summary: "Có số đơn trong nhật ký nhưng chưa có ca Hub tương ứng.",
        title: `Nhật ký ngày ${formatDate(entry.date)} chưa liên kết ca`,
      });
    }
  });

  return issues;
}

function getLatestReconciliationLines(
  reconciliations: AccountReconciliation[]
) {
  const sorted = [...reconciliations].sort(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      right.updatedAt.localeCompare(left.updatedAt)
  );
  const latest = new Map<
    string,
    { check: AccountReconciliation; line: AccountReconciliation["lines"][number] }
  >();

  sorted.forEach((check) => {
    check.lines.forEach((line) => {
      if (!latest.has(line.accountId)) latest.set(line.accountId, { check, line });
    });
  });

  return latest;
}

function buildAccountIssues(input: DataHealthInput) {
  const issues: DataHealthIssue[] = [];
  const accountsById = new Map(input.accounts.map((account) => [account.id, account]));
  const transactionsById = new Map(
    input.accountTransactions.map((transaction) => [transaction.id, transaction])
  );
  const latestLines = getLatestReconciliationLines(input.reconciliations);

  latestLines.forEach(({ check, line }, accountId) => {
    const account = accountsById.get(accountId);

    if (!account) {
      issues.push({
        action: { checkId: check.id, date: check.date, kind: "reconciliation" },
        actionLabel: "Mở kiểm kê",
        category: "accounts",
        cause:
          "Lần kiểm kê đang tham chiếu một tài khoản không còn tồn tại trong Sổ tài khoản.",
        date: check.date,
        facts: [
          { label: "Tài khoản", value: line.accountName },
          { label: "Mã tài khoản", value: line.accountId },
        ],
        id: `account:missing:${check.id}:${line.accountId}`,
        resolution:
          "Mở kiểm kê để loại bỏ dòng cũ hoặc tạo lại tài khoản nếu dữ liệu này vẫn cần được theo dõi.",
        severity: "error",
        summary: `${line.accountName} trong kiểm kê không còn có trong Sổ tài khoản.`,
        title: "Kiểm kê tham chiếu tài khoản đã mất",
      });
      return;
    }

    const expectedStoredDifference =
      line.actualBalance - line.expectedBalance;
    if (Math.abs(expectedStoredDifference - line.difference) >= MONEY_TOLERANCE) {
      issues.push({
        action: { checkId: check.id, date: check.date, kind: "reconciliation" },
        actionLabel: "Sửa kiểm kê",
        category: "accounts",
        cause:
          "Chênh lệch đã lưu không bằng số dư thực tế trừ số dư dự kiến của chính lần kiểm kê này.",
        date: check.date,
        facts: [
          { label: "Đã lưu", value: formatMoneyValue(line.difference) },
          {
            label: "Tính lại",
            value: formatMoneyValue(expectedStoredDifference),
          },
        ],
        id: `account:stored-difference:${check.id}:${accountId}`,
        resolution:
          "Mở lần kiểm kê và lưu cập nhật để tính lại chênh lệch từ hai số dư gốc.",
        severity: "error",
        summary: "Công thức chênh lệch bên trong lần kiểm kê không còn nhất quán.",
        title: `Kiểm kê ${account.name} có chênh lệch sai`,
      });
    }

    if (
      line.adjustmentTransactionId &&
      !transactionsById.has(line.adjustmentTransactionId)
    ) {
      issues.push({
        action: { checkId: check.id, date: check.date, kind: "reconciliation" },
        actionLabel: "Mở kiểm kê",
        category: "accounts",
        cause:
          "Dòng kiểm kê được đánh dấu đã điều chỉnh nhưng giao dịch điều chỉnh tương ứng không còn trong Sổ tài khoản.",
        date: check.date,
        facts: [
          { label: "Tài khoản", value: account.name },
          { label: "Giao dịch bị thiếu", value: line.adjustmentTransactionId },
        ],
        id: `account:missing-adjustment:${check.id}:${accountId}`,
        resolution:
          "Mở kiểm kê, xác minh nguyên nhân rồi tạo lại giao dịch điều chỉnh hoặc bỏ trạng thái đã xử lý.",
        severity: "error",
        summary: "Kiểm kê báo đã xử lý nhưng giao dịch điều chỉnh không tồn tại.",
        title: `Thiếu giao dịch điều chỉnh của ${account.name}`,
      });
    }

    const ledgerBalance = calculateAccountBalanceAtDate(
      account,
      input.accountTransactions,
      check.date
    );
    const difference = line.actualBalance - ledgerBalance;

    if (Math.abs(difference) >= MONEY_TOLERANCE) {
      const wasAdjusted = Boolean(line.adjustmentTransactionId);
      issues.push({
        action: { checkId: check.id, date: check.date, kind: "reconciliation" },
        actionLabel: "Đối chiếu tài khoản",
        category: "accounts",
        cause: wasAdjusted
          ? "Sau khi áp dụng giao dịch điều chỉnh, số dư Sổ tài khoản tại ngày kiểm kê vẫn chưa bằng số dư thực tế."
          : "Số dư thực tế của lần kiểm kê gần nhất chưa khớp với Sổ tài khoản tại cùng ngày.",
        date: check.date,
        facts: [
          { label: "Sổ tài khoản", value: formatMoneyValue(ledgerBalance) },
          { label: "Kiểm kê thực tế", value: formatMoneyValue(line.actualBalance) },
          { label: "Còn lệch", value: formatMoneyValue(difference) },
        ],
        id: `account:balance-mismatch:${check.id}:${accountId}`,
        resolution:
          "Mở Trung tâm kiểm kê, chọn nguyên nhân chính xác rồi ghi giao dịch còn thiếu hoặc tạo điều chỉnh vào Sổ tài khoản.",
        severity: wasAdjusted ? "error" : "warning",
        summary: `${account.name} đang lệch ${formatMoneyValue(difference)} so với kiểm kê gần nhất.`,
        title: `${account.name} không khớp kiểm kê`,
      });
    }
  });

  return issues;
}

function calculateMainGoalMoneyAtDate(
  goals: Goals,
  entries: DailyEntry[],
  expenses: ExpenseEntry[],
  date: string
) {
  const startDate = goals.bigGoalStartDate;
  if (!startDate || date < startDate) return goals.bigGoalSaved;

  const income = sum(
    entries.filter((entry) => entry.date >= startDate && entry.date <= date),
    getTotalEntryMoney
  );
  const expense = sum(
    expenses.filter((entry) => entry.date >= startDate && entry.date <= date),
    getExpenseTotal
  );

  return goals.bigGoalSaved + income - expense;
}

function addSubGoalIntegrityIssues(
  issues: DataHealthIssue[],
  goal: SubGoal
) {
  const seenContributionIds = new Set<string>();

  goal.contributions.forEach((contribution) => {
    if (seenContributionIds.has(contribution.id)) {
      issues.push({
        action: { goalId: goal.id, kind: "goal", screen: "subGoals" },
        actionLabel: "Sửa mục tiêu phụ",
        category: "goals",
        cause:
          "Hai lần góp trong cùng mục tiêu đang dùng chung mã bản ghi, có thể khiến đồng bộ ghi đè hoặc tính tiền không ổn định.",
        date: contribution.date,
        facts: [
          { label: "Mục tiêu", value: goal.name },
          { label: "Mã lần góp", value: contribution.id },
          { label: "Số tiền", value: formatMoneyValue(contribution.amount) },
        ],
        id: `goal:duplicate-contribution:${goal.id}:${contribution.id}`,
        resolution:
          "Mở mục tiêu phụ, xóa lần góp bị lặp rồi nhập lại nếu đó là hai khoản góp thực sự khác nhau.",
        severity: "error",
        summary: "Lịch sử góp tiền có mã bản ghi bị lặp.",
        title: `${goal.name} có lần góp bị trùng`,
      });
    }
    seenContributionIds.add(contribution.id);

    if (!isFiniteNumber(contribution.amount) || contribution.amount <= 0) {
      issues.push({
        action: { goalId: goal.id, kind: "goal", screen: "subGoals" },
        actionLabel: "Sửa lần góp",
        category: "goals",
        cause:
          "Một lần góp có giá trị bằng 0, âm hoặc không phải số hợp lệ nên tổng tích lũy không thể tính chính xác.",
        date: contribution.date,
        facts: [
          { label: "Mục tiêu", value: goal.name },
          { label: "Giá trị", value: String(contribution.amount) },
        ],
        id: `goal:invalid-contribution:${goal.id}:${contribution.id}`,
        resolution: "Mở lịch sử góp tiền để sửa số tiền thành giá trị dương hoặc xóa lần góp sai.",
        severity: "error",
        summary: "Lịch sử góp tiền chứa số tiền không hợp lệ.",
        title: `${goal.name} có lần góp sai giá trị`,
      });
    }
  });

  const saved = getSubGoalSaved(goal);
  if (
    !isFiniteNumber(goal.saved) ||
    goal.saved < 0 ||
    !isFiniteNumber(saved) ||
    saved < 0
  ) {
    issues.push({
      action: { goalId: goal.id, kind: "goal", screen: "subGoals" },
      actionLabel: "Sửa mục tiêu phụ",
      category: "goals",
      cause:
        "Tiền có sẵn hoặc tổng sau khi cộng các lần góp đang âm hay không phải số hợp lệ.",
      facts: [
        { label: "Mục tiêu", value: goal.name },
        { label: "Tiền có sẵn", value: String(goal.saved) },
        { label: "Tổng tính lại", value: String(saved) },
      ],
      id: `goal:invalid-total:${goal.id}`,
      resolution:
        "Mở mục tiêu phụ để sửa tiền có sẵn và từng lần góp, sau đó kiểm tra lại tổng tích lũy.",
      severity: "error",
      summary: "Tổng tiền tích lũy của mục tiêu không phải giá trị hợp lệ.",
      title: `${goal.name} có tổng tích lũy sai`,
    });
  }
}

function buildGoalIssues(input: DataHealthInput) {
  const issues: DataHealthIssue[] = [];

  (input.goals.subGoals ?? []).forEach((goal) => {
    addSubGoalIntegrityIssues(issues, goal);
  });

  input.balanceChecks.forEach((check) => {
    const expected = calculateMainGoalMoneyAtDate(
      input.goals,
      input.entries,
      input.expenses,
      check.date
    );

    if (Math.abs(check.appMoney - expected) < MONEY_TOLERANCE) return;

    issues.push({
      action: {
        date: check.date,
        kind: "balanceCheck",
        recordId: check.id,
      },
      actionLabel: "Tính lại kiểm kê",
      category: "goals",
      cause:
        "Thu nhập, chi tiêu hoặc tiền ban đầu đã thay đổi sau lần kiểm kê, nên số tiền App tính được lưu tại ngày đó không còn khớp dữ liệu nguồn.",
      date: check.date,
      facts: [
        { label: "Đã lưu", value: formatMoneyValue(check.appMoney) },
        { label: "Tính lại", value: formatMoneyValue(expected) },
        { label: "Chênh lệch", value: formatMoneyValue(check.appMoney - expected) },
      ],
      id: `goal:balance-snapshot:${check.id}`,
      resolution:
        "Mở kiểm kê số dư ngày này và lưu lại để cập nhật số tiền App tính theo nhật ký và chi tiêu mới nhất.",
      severity: "warning",
      summary: "Số tích lũy mục tiêu tại lần kiểm kê đã cũ so với dữ liệu hiện tại.",
      title: `Tiền mục tiêu ngày ${formatDate(check.date)} không khớp`,
    });
  });

  input.completedGoals.forEach((goal) => {
    const latestSnapshot = [...(goal.goalProgressSnapshots ?? [])].sort((a, b) =>
      b.date.localeCompare(a.date)
    )[0];

    if (
      !latestSnapshot ||
      Math.abs(latestSnapshot.saved - goal.saved) < MONEY_TOLERANCE
    ) {
      return;
    }

    issues.push({
      action: { goalId: goal.id, kind: "goal", screen: "completed" },
      actionLabel: "Xem mục tiêu",
      category: "goals",
      cause:
        "Số tiền khi hoàn thành khác mốc tích lũy cuối cùng trong ảnh chụp lịch sử của mục tiêu.",
      date: goal.completedAt,
      facts: [
        { label: "Khi hoàn thành", value: formatMoneyValue(goal.saved) },
        { label: "Mốc cuối", value: formatMoneyValue(latestSnapshot.saved) },
      ],
      id: `goal:completed-snapshot:${goal.id}`,
      resolution:
        "Mở chi tiết mục tiêu đã hoàn thành để xác minh lịch sử góp tiền trước khi sử dụng số liệu trong báo cáo.",
      severity: "warning",
      summary: "Ảnh chụp tiến độ cuối không bằng số tiền được ghi khi hoàn thành.",
      title: `${goal.name} có lịch sử tích lũy không khớp`,
    });
  });

  return issues;
}

export function buildDataHealthReport(
  input: DataHealthInput,
  generatedAt = new Date().toISOString()
): DataHealthReport {
  const issues = [
    ...buildDuplicateIssues(input),
    ...buildHubIssues(input),
    ...buildJournalIssues(input),
    ...buildAccountIssues(input),
    ...buildGoalIssues(input),
  ].sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "error" ? -1 : 1;
    }

    return (right.date ?? "").localeCompare(left.date ?? "");
  });

  return {
    checkedByCategory: {
      accounts: input.accounts.filter((account) => !account.archivedAt).length,
      duplicates:
        input.entries.length +
        input.expenses.length +
        input.balanceChecks.length +
        input.reconciliations.length,
      goals:
        (input.goals.subGoals?.length ?? 0) +
        input.completedGoals.length +
        input.balanceChecks.length,
      hub: input.hubEntries.length,
      journal: input.entries.length + new Set(input.hubEntries.map((entry) => entry.date)).size,
    },
    generatedAt,
    issues,
  };
}
