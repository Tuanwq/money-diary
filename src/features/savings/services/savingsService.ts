import type { AccountLedgerData, AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import { calculateSavingsAmount, getSavingsAvailable, getSavingsIncome, savingsResultId,
  type SavingsAllocation, type SavingsRule } from "../domain/savingsModel.ts";

export type SavingsCommand =
  | { type: "save_rule"; rule: SavingsRule }
  | { type: "pause_rule"; ruleId: string; paused: boolean }
  | { type: "delete_rule"; ruleId: string }
  | { type: "refresh"; today: string }
  | { type: "confirm"; resultId: string; amount?: number }
  | { type: "skip"; resultId: string }
  | { type: "recalculate"; resultId: string }
  | { type: "release"; resultId: string };

function sample(rule: SavingsRule, random: () => number) {
  if (!rule.mode.startsWith("random_")) return undefined;
  const lower = Math.max(0, rule.minimum ?? 0);
  const upper = Math.max(lower, rule.maximum ?? lower);
  return lower + Math.floor(Math.min(0.999999999, Math.max(0, random())) * (upper - lower + 1));
}

export function validateSavingsRule(ledger: AccountLedgerData, rule: SavingsRule) {
  const source = ledger.accounts.find((item) => item.id === rule.sourceAccountId && !item.archivedAt);
  if (!source) throw new Error("Hãy chọn tài khoản nguồn đang hoạt động.");
  if (!rule.name.trim()) throw new Error("Hãy đặt tên quy tắc tiết kiệm.");
  if (rule.mode.startsWith("random_")) {
    if (!Number.isFinite(rule.minimum) || !Number.isFinite(rule.maximum) ||
      (rule.minimum ?? -1) < 0 || (rule.maximum ?? -1) <= 0 ||
      (rule.maximum ?? -1) < (rule.minimum ?? 0))
      throw new Error("Khoảng ngẫu nhiên không hợp lệ.");
    if (rule.mode === "random_percentage" && (rule.maximum ?? 0) > 100)
      throw new Error("Phần trăm tối đa phải nhỏ hơn hoặc bằng 100.");
  } else if (!Number.isFinite(rule.value) || rule.value <= 0 ||
    (rule.mode === "fixed" && !Number.isSafeInteger(rule.value)) ||
    (rule.mode === "percentage" && rule.value > 100))
    throw new Error("Số tiền hoặc tỷ lệ tiết kiệm không hợp lệ.");
  if (!Number.isFinite(rule.minimumRemaining) || rule.minimumRemaining < 0 ||
    (rule.dailyCap !== undefined && (!Number.isFinite(rule.dailyCap) || rule.dailyCap <= 0)))
    throw new Error("Giới hạn tiết kiệm không hợp lệ.");
  if (rule.destination.kind === "transfer") {
    const destinationAccountId = rule.destination.accountId;
    if (destinationAccountId === rule.sourceAccountId ||
      !ledger.accounts.some((item) => item.id === destinationAccountId && !item.archivedAt))
      throw new Error("Hãy chọn tài khoản tiết kiệm đích khác tài khoản nguồn.");
  }
}

function resultFor(ledger: AccountLedgerData, rule: SavingsRule, date: string,
  random: () => number, now: string): SavingsAllocation | null {
  const income = getSavingsIncome(ledger, rule, date);
  if (income.income <= 0) return null;
  const sampledValue = sample(rule, random);
  const amount = calculateSavingsAmount(rule, income.base, sampledValue);
  if (amount <= 0) return null;
  return { id: savingsResultId(rule.id, date), ruleId: rule.id, date,
    sourceAccountId: rule.sourceAccountId, destination: rule.destination,
    amount, sampledValue, incomeSignature: income.signature,
    incomeAmount: income.income, workCostsAmount: income.workCosts, basisAmount: income.base,
    ruleName: rule.name, ruleMode: rule.mode, ruleValue: sampledValue ?? rule.value,
    basisKind: rule.basis,
    status: "proposed",
    createdAt: now, updatedAt: now };
}

function commit(ledger: AccountLedgerData, result: SavingsAllocation, amount: number, now: string) {
  const rule = ledger.savingsRules?.find((item) => item.id === result.ruleId);
  if (!rule) throw new Error("Không tìm thấy quy tắc tiết kiệm.");
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount))
    throw new Error("Số tiền tiết kiệm phải là số nguyên dương.");
  if (rule.dailyCap !== undefined && amount > rule.dailyCap)
    throw new Error("Số tiền vượt mức tối đa tiết kiệm trong ngày.");
  if (amount > Math.max(0, getSavingsAvailable(ledger, result.sourceAccountId) - rule.minimumRemaining))
    throw new Error("Không đủ tiền khả dụng sau khi giữ lại mức tối thiểu.");
  const transactionId = result.destination.kind === "transfer" ? `saving-transfer:${result.id}` : undefined;
  const transaction: AccountTransaction | null = transactionId && result.destination.kind === "transfer"
    ? { id: transactionId, accountId: result.sourceAccountId, toAccountId: result.destination.accountId,
      amount, category: "Tiết kiệm tự động", date: result.date, type: "transfer", purpose: "internal_transfer",
      source: "savings", note: `Tiết kiệm theo quy tắc ${rule.name}`, createdAt: now, updatedAt: now }
    : null;
  return { ...ledger,
    transactions: transaction ? [transaction, ...ledger.transactions] : ledger.transactions,
    savingsAllocations: (ledger.savingsAllocations ?? []).map((item) => item.id === result.id
      ? { ...item, amount, status: transaction ? "transferred" as const : "allocated" as const,
        transactionId, manuallyAdjusted: amount !== result.amount, updatedAt: now } : item) };
}

/** Pure ledger command: result and any transfer are saved in the same ledger revision. */
export function applySavingsCommand(ledger: AccountLedgerData, command: SavingsCommand,
  now = new Date().toISOString(), random: () => number = Math.random): AccountLedgerData {
  const rules = ledger.savingsRules ?? [];
  const outcomes = ledger.savingsAllocations ?? [];
  if (command.type === "save_rule") {
    validateSavingsRule(ledger, command.rule);
    return { ...ledger, savingsRules: rules.some((item) => item.id === command.rule.id)
      ? rules.map((item) => item.id === command.rule.id ? command.rule : item)
      : [...rules, command.rule] };
  }
  if (command.type === "pause_rule" || command.type === "delete_rule")
    return { ...ledger, savingsRules: rules.map((item) => item.id === command.ruleId
      ? { ...item, paused: command.type === "pause_rule" ? command.paused : true,
        deletedAt: command.type === "delete_rule" ? now : item.deletedAt, updatedAt: now } : item) };
  if (command.type === "refresh") {
    let next = ledger;
    const yesterday = new Date(`${command.today}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dates = new Set([command.today, yesterday.toISOString().slice(0, 10),
      ...outcomes.map((item) => item.date), ...ledger.transactions.filter((item) => item.type === "income").map((item) => item.date)]);
    for (const rule of rules) {
      for (const date of [...dates].sort()) {
        const existing = (next.savingsAllocations ?? []).find((item) => item.id === savingsResultId(rule.id, date));
        const income = getSavingsIncome(next, rule, date);
        if (existing) {
          if (existing.incomeSignature === income.signature) {
            if (existing.status === "proposed" && rule.execution === "automatic" && !rule.paused &&
              (rule.cadence === "per_income" || date < command.today)) {
              const amount = Math.min(existing.amount,
                Math.max(0, getSavingsAvailable(next, rule.sourceAccountId) - rule.minimumRemaining));
              if (amount > 0) next = commit(next, existing, amount, now);
            }
            continue;
          }
          if (existing.status === "needs_recalculation") continue;
          const updated = existing.status === "proposed"
            ? { ...existing, amount: calculateSavingsAmount(rule, income.base, existing.sampledValue),
                status: income.income > 0 && income.base > 0 ? "proposed" as const : "skipped" as const,
                incomeSignature: income.signature, incomeAmount: income.income,
                workCostsAmount: income.workCosts, basisAmount: income.base, updatedAt: now }
            : { ...existing, status: "needs_recalculation" as const,
                previousStatus: existing.status === "allocated" || existing.status === "transferred"
                  ? existing.status : "skipped" as const, updatedAt: now };
          next = { ...next, savingsAllocations: (next.savingsAllocations ?? []).map((item) =>
            item.id === existing.id ? updated : item) };
          if (updated.status === "proposed" && rule.execution === "automatic" && !rule.paused &&
            (rule.cadence === "per_income" || date < command.today)) {
            const amount = Math.min(updated.amount,
              Math.max(0, getSavingsAvailable(next, rule.sourceAccountId) - rule.minimumRemaining));
            if (amount > 0) next = commit(next, updated, amount, now);
          }
          continue;
        }
        if (rule.paused || rule.deletedAt || date < rule.startDate || date > command.today) continue;
        const result = resultFor(next, rule, date, random, now);
        if (!result) continue;
        next = { ...next, savingsAllocations: [...(next.savingsAllocations ?? []), result] };
        if (rule.execution === "automatic" && (rule.cadence === "per_income" || date < command.today)) {
          const amount = Math.min(result.amount,
            Math.max(0, getSavingsAvailable(next, rule.sourceAccountId) - rule.minimumRemaining));
          if (amount > 0) next = commit(next, result, amount, now);
        }
      }
    }
    return next;
  }
  const result = outcomes.find((item) => item.id === command.resultId);
  if (!result) throw new Error("Không tìm thấy khoản tiết kiệm.");
  if (command.type === "skip") {
    if (result.status !== "proposed") throw new Error("Chỉ có thể bỏ qua khoản đang đề xuất.");
    return { ...ledger, savingsAllocations: outcomes.map((item) => item.id === result.id
      ? { ...item, status: "skipped", updatedAt: now } : item) };
  }
  if (command.type === "release") {
    if (result.status !== "allocated") throw new Error("Chỉ có thể giải phóng khoản đã dành riêng.");
    return { ...ledger, savingsAllocations: outcomes.map((item) => item.id === result.id
      ? { ...item, status: "skipped", updatedAt: now } : item) };
  }
  if (command.type === "recalculate") {
    const rule = rules.find((item) => item.id === result.ruleId);
    if (!rule) throw new Error("Không tìm thấy quy tắc tiết kiệm.");
    const income = getSavingsIncome(ledger, rule, result.date);
    const withoutTransfer = result.transactionId
      ? ledger.transactions.filter((item) => item.id !== result.transactionId) : ledger.transactions;
    return { ...ledger, transactions: withoutTransfer,
      savingsAllocations: outcomes.map((item) => item.id === result.id
        ? { ...item, status: income.income > 0 && income.base > 0 ? "proposed" : "skipped",
          amount: calculateSavingsAmount(rule, income.base, item.sampledValue),
          transactionId: undefined, previousStatus: undefined, incomeSignature: income.signature,
          incomeAmount: income.income, workCostsAmount: income.workCosts, basisAmount: income.base,
          updatedAt: now } : item) };
  }
  if (result.status !== "proposed") throw new Error("Khoản tiết kiệm đã được xử lý.");
  return commit(ledger, result, command.amount ?? result.amount, now);
}
