import { calculateAccountBalance, type AccountTransaction, type TransactionPurpose } from "../../account-ledger/accountLedgerModel.ts";
import { getAccountAvailableToAllocate, getJarView, type JarActivity, type JarLedger,
  type JarSource, type SpendingJar } from "../domain/jarModel.ts";

type Context = { id: string; now: string };
type JarFields = Pick<SpendingJar, "name" | "icon" | "color" | "limitAmount" | "startDate" | "endDate" | "linkedLabels">;
export type JarCommand =
  | ({ kind: "create"; fields: JarFields } & Context)
  | ({ kind: "edit"; jarId: string; fields: JarFields } & Context)
  | ({ kind: "allocate" | "release"; jarId: string; accountId: string; amount: number; note?: string } & Context)
  | ({ kind: "smart_allocate"; jarId: string; strategy?: SmartAllocationStrategy;
      priority?: string[] } & Context)
  | ({ kind: "transfer"; jarId: string; toJarId: string; accountId: string; amount: number } & Context)
  | ({ kind: "spend"; jarId: string; amount: number; accountId?: string; date: string;
      category: string; note: string; purpose: "daily_expense" | "goal_allocation";
      activityId?: string; occurredAt?: string } & Context)
  | ({ kind: "refund"; jarId: string; accountId: string; amount: number; date: string;
      note: string } & Context)
  | ({ kind: "delete_spend"; jarId: string; activityId: string } & Context)
  | ({ kind: "close" | "delete"; jarId: string } & Context);

function positive(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Số tiền phải là số nguyên dương.");
}

function getActiveJar(ledger: JarLedger, id: string) {
  const jar = ledger.jars.find((item) => item.id === id && item.status === "active");
  if (!jar) throw new Error("Hũ này đã đóng hoặc không tồn tại.");
  return jar;
}

function getActiveAccount(ledger: JarLedger, id: string) {
  const account = ledger.accounts.find((item) => item.id === id && !item.archivedAt);
  if (!account) throw new Error("Tài khoản không còn hoạt động.");
  return account;
}

function normalizeFields(fields: JarFields) {
  const name = fields.name.trim();
  if (!name || name.length > 60) throw new Error("Tên hũ cần từ 1 đến 60 ký tự.");
  positive(fields.limitAmount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.startDate) ||
    (fields.endDate && fields.endDate < fields.startDate))
    throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ.");
  return { ...fields, name, icon: fields.icon.trim() || "🫙",
    linkedLabels: [...new Set(fields.linkedLabels.map((label) => label.trim()).filter(Boolean))] };
}

function remainingLimit(ledger: JarLedger, jar: SpendingJar) {
  const view = getJarView(ledger, jar);
  return Math.max(0, jar.limitAmount - view.remainingAmount - view.spentAmount);
}

export type SmartAllocationStrategy = "priority" | "largest_balance" | "cash_first";

export function smartAllocate(ledger: JarLedger, jarId: string, strategy: SmartAllocationStrategy = "priority",
  priority: string[] = []): JarSource[] {
  const jar = getActiveJar(ledger, jarId);
  let needed = remainingLimit(ledger, jar);
  const active = ledger.accounts.filter((account) => !account.archivedAt);
  const ordered = [...active].sort((left, right) => {
    if (strategy === "largest_balance")
      return getAccountAvailableToAllocate(ledger, right.id) - getAccountAvailableToAllocate(ledger, left.id);
    if (strategy === "cash_first") return Number(right.type === "cash") - Number(left.type === "cash");
    const leftIndex = priority.indexOf(left.id);
    const rightIndex = priority.indexOf(right.id);
    return (leftIndex < 0 ? Infinity : leftIndex) - (rightIndex < 0 ? Infinity : rightIndex);
  });
  const result: JarSource[] = [];
  for (const account of ordered) {
    const amount = Math.min(needed, getAccountAvailableToAllocate(ledger, account.id));
    if (amount > 0) result.push({ accountId: account.id, amount });
    needed -= amount;
    if (needed === 0) break;
  }
  return result;
}

export function planJarSpend(ledger: JarLedger, jarId: string, amount: number, accountId?: string) {
  positive(amount);
  const jar = getActiveJar(ledger, jarId);
  const view = getJarView(ledger, jar);
  if (amount > view.remainingAmount) throw new Error("Hũ không còn đủ tiền đã phân bổ.");
  let needed = amount;
  const sources = accountId ? view.sources.filter((item) => item.accountId === accountId) : view.sources;
  const lines: JarSource[] = [];
  for (const source of sources) {
    const account = getActiveAccount(ledger, source.accountId);
    const available = Math.min(source.amount, Math.max(0, calculateAccountBalance(account, ledger.transactions)));
    const take = Math.min(needed, available);
    if (take > 0) lines.push({ accountId: source.accountId, amount: take });
    needed -= take;
    if (needed === 0) break;
  }
  if (needed > 0) throw new Error("Tài khoản nguồn hoặc phần phân bổ không đủ tiền để chi.");
  return lines;
}

function addActivity(ledger: JarLedger, activity: JarActivity): JarLedger {
  return { ...ledger, jarActivities: [...ledger.jarActivities, activity] };
}

/** Pure aggregate transition. The ledger hook persists the result as one local/cloud state. */
export function applyJarCommand(ledger: JarLedger, command: JarCommand): JarLedger {
  if (command.kind === "create") {
    if (ledger.jars.some((jar) => jar.id === command.id)) return ledger;
    const fields = normalizeFields(command.fields);
    return { ...ledger, jars: [...ledger.jars, { ...fields, id: command.id, status: "active",
      createdAt: command.now, updatedAt: command.now }] };
  }

  const jar = getActiveJar(ledger, command.jarId);
  if (command.kind === "edit") {
    const fields = normalizeFields(command.fields);
    const view = getJarView(ledger, jar);
    if (fields.limitAmount < view.remainingAmount + view.spentAmount)
      throw new Error("Hạn mức mới thấp hơn tổng đã tiêu và còn trong hũ.");
    return { ...ledger, jars: ledger.jars.map((item) => item.id === jar.id
      ? { ...item, ...fields, updatedAt: command.now } : item) };
  }
  if (command.kind === "allocate" || command.kind === "release") {
    positive(command.amount);
    getActiveAccount(ledger, command.accountId);
    const sourceRemaining = getJarView(ledger, jar).sources.find((source) =>
      source.accountId === command.accountId)?.amount ?? 0;
    if (command.kind === "allocate" && command.amount > getAccountAvailableToAllocate(ledger, command.accountId))
      throw new Error("Tài khoản không còn đủ tiền chưa phân bổ.");
    if (command.kind === "allocate" && command.amount > remainingLimit(ledger, jar))
      throw new Error("Số tiền nạp vượt hạn mức hũ.");
    if (command.kind === "release" && command.amount > sourceRemaining)
      throw new Error("Nguồn này không còn đủ tiền trong hũ để giải phóng.");
    if (ledger.jarActivities.some((activity) => activity.id === command.id)) return ledger;
    return addActivity(ledger, { id: command.id, jarId: jar.id, kind: command.kind,
      accountId: command.accountId, amount: command.amount, note: command.note,
      createdAt: command.now });
  }
  if (command.kind === "smart_allocate") {
    const lines = smartAllocate(ledger, jar.id, command.strategy, command.priority);
    if (lines.length === 0) throw new Error("Chưa có tiền khả dụng để chia vào hũ.");
    if (ledger.jarActivities.some((activity) => activity.id === `${command.id}:${lines[0].accountId}`)) return ledger;
    return { ...ledger, jarActivities: [...ledger.jarActivities,
      ...lines.map((line) => ({ id: `${command.id}:${line.accountId}`, jarId: jar.id,
        kind: "allocate" as const, accountId: line.accountId, amount: line.amount,
        note: "Chia thông minh", createdAt: command.now }))] };
  }
  if (command.kind === "transfer") {
    positive(command.amount);
    const destination = getActiveJar(ledger, command.toJarId);
    if (jar.id === destination.id) throw new Error("Hãy chọn một hũ khác.");
    const source = getJarView(ledger, jar).sources.find((item) => item.accountId === command.accountId);
    if (!source || source.amount < command.amount) throw new Error("Nguồn trong hũ không đủ tiền.");
    if (command.amount > remainingLimit(ledger, destination)) throw new Error("Hũ nhận không còn đủ hạn mức.");
    if (ledger.jarActivities.some((activity) => activity.id === `${command.id}:out`)) return ledger;
    return { ...ledger, jarActivities: [...ledger.jarActivities,
      { id: `${command.id}:out`, jarId: jar.id, kind: "transfer_out", accountId: command.accountId,
        amount: command.amount, relatedJarId: destination.id, createdAt: command.now },
      { id: `${command.id}:in`, jarId: destination.id, kind: "transfer_in", accountId: command.accountId,
        amount: command.amount, relatedJarId: jar.id, createdAt: command.now },
    ] };
  }
  if (command.kind === "spend") {
    if (!command.activityId && ledger.jarActivities.some((item) => item.id === command.id)) return ledger;
    const existing = command.activityId ? ledger.jarActivities.find((item) =>
      item.id === command.activityId && item.jarId === jar.id && item.kind === "spend") : undefined;
    const oldIds = new Set(existing?.transactionIds ?? []);
    const base = existing ? { ...ledger,
      transactions: ledger.transactions.filter((item) => !oldIds.has(item.id)),
      jarActivities: ledger.jarActivities.filter((item) => item.id !== existing.id),
    } : ledger;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(command.date)) throw new Error("Ngày chi không hợp lệ.");
    if (!command.category.trim()) throw new Error("Hãy chọn nhãn khoản chi.");
    const lines = planJarSpend(base, jar.id, command.amount, command.accountId);
    const activityId = existing?.id ?? command.id;
    const oldTransactions = new Map(ledger.transactions.map((item) => [item.id, item]));
    const transactions: AccountTransaction[] = lines.map((line, index) => {
      // Stable line positions keep an attached photo tied to the first posting
      // when the user edits which account paid for the same jar activity.
      const id = `jar-spend:${activityId}:${index}`;
      return { id, accountId: line.accountId, amount: line.amount, category: command.category.trim(),
        date: command.date, note: command.note.trim(), type: "expense",
        purpose: command.purpose as TransactionPurpose, source: "spending_jar",
        jarId: jar.id, jarActivityId: activityId,
        occurredAt: command.occurredAt ?? oldTransactions.get(id)?.occurredAt,
        createdAt: oldTransactions.get(id)?.createdAt ?? command.now, updatedAt: command.now };
    });
    return { ...base, transactions: [...transactions, ...base.transactions],
      jarActivities: [...base.jarActivities, { id: activityId, jarId: jar.id,
        kind: "spend", transactionIds: transactions.map((item) => item.id),
        note: command.note.trim(), createdAt: existing?.createdAt ?? command.now }] };
  }
  if (command.kind === "delete_spend") {
    const activity = ledger.jarActivities.find((item) => item.id === command.activityId &&
      item.jarId === jar.id && item.kind === "spend");
    if (!activity) throw new Error("Không tìm thấy khoản chi cần xóa.");
    const transactionIds = new Set(activity.transactionIds ?? []);
    return { ...ledger,
      transactions: ledger.transactions.filter((item) => !transactionIds.has(item.id)),
      jarActivities: ledger.jarActivities.filter((item) => item.id !== activity.id),
    };
  }
  if (command.kind === "refund") {
    positive(command.amount);
    getActiveAccount(ledger, command.accountId);
    const spent = ledger.transactions.filter((item) => item.jarId === jar.id &&
      item.accountId === command.accountId && item.source === "spending_jar")
      .reduce((sum, item) => sum + (item.type === "expense" ? item.amount : -item.amount), 0);
    if (command.amount > spent) throw new Error("Hoàn tiền vượt số đã chi từ tài khoản này.");
    if (ledger.jarActivities.some((item) => item.id === command.id)) return ledger;
    const transactionId = `jar-refund:${command.id}`;
    const transaction: AccountTransaction = { id: transactionId, accountId: command.accountId,
      amount: command.amount, category: "Hoàn tiền", date: command.date, note: command.note.trim(),
      type: "income", purpose: "goal_allocation", source: "spending_jar",
      jarId: jar.id, jarActivityId: command.id, createdAt: command.now, updatedAt: command.now };
    return { ...ledger, transactions: [transaction, ...ledger.transactions],
      jarActivities: [...ledger.jarActivities, { id: command.id, jarId: jar.id, kind: "refund",
        transactionIds: [transactionId], note: command.note.trim(), createdAt: command.now }] };
  }
  if (command.kind === "delete") {
    if (ledger.jarActivities.some((activity) => activity.jarId === jar.id))
      throw new Error("Hũ đã có lịch sử. Hãy đóng hũ để giữ lại dữ liệu.");
    return { ...ledger, jars: ledger.jars.filter((item) => item.id !== jar.id) };
  }
  if (command.kind === "close") {
    const sources = getJarView(ledger, jar).sources;
    return { ...ledger, jars: ledger.jars.map((item) => item.id === jar.id
      ? { ...item, status: "closed", updatedAt: command.now } : item),
    jarActivities: [...ledger.jarActivities,
      ...sources.filter((source) => source.amount > 0).map((source) => ({
        id: `${command.id}:release:${source.accountId}`, jarId: jar.id, kind: "release" as const,
        accountId: source.accountId, amount: source.amount, note: "Giải phóng khi đóng hũ",
        createdAt: command.now,
      })),
      { id: command.id, jarId: jar.id, kind: "close", createdAt: command.now }],
    };
  }
  return ledger;
}
