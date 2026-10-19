import { TRANSACTION_CATEGORIES, type AccountLedgerData, type AccountTransaction,
  type TransactionCategory } from "./accountLedgerModel.ts";

type CategoryType = "income" | "expense";
export type CategoryCommand =
  | { kind: "add"; id: string; name: string; type: TransactionCategory["type"]; color?: string; icon?: string }
  | { kind: "edit"; id: string; name: string; color?: string; icon?: string }
  | { kind: "delete"; id: string; replacementId?: string; now: string };

const key = (type: CategoryType, name: string) => `${type}:${name.trim().toLocaleLowerCase("vi-VN")}`;
const legacyId = (type: CategoryType, name: string) => `category:${encodeURIComponent(key(type, name))}`;

/** A one-time, deterministic bridge from name-only transactions to stable IDs. */
export function migrateTransactionCategories(ledger: AccountLedgerData): AccountLedgerData {
  if (ledger.categories !== undefined && ledger.categories.length > 0) {
    const categories = [...ledger.categories];
    let changed = false;
    const transactions = ledger.transactions.map((item) => {
      if (item.categoryId || item.type === "transfer" || !item.category.trim()) return item;
      const name = item.category.trim();
      const matching = categories.find((category) => !category.deletedAt && category.name === name &&
        (category.type === item.type || category.type === "both"));
      if (matching) { changed = true; return { ...item, categoryId: matching.id }; }
      if (categories.some((category) => category.deletedAt && category.name === name &&
        (category.type === item.type || category.type === "both"))) return item;
      const id = legacyId(item.type, name);
      if (!categories.some((category) => category.id === id)) categories.push({ id, name, type: item.type });
      changed = true;
      return { ...item, categoryId: id };
    });
    return changed ? { ...ledger, categories, transactions } : ledger;
  }
  const categories: TransactionCategory[] = [];
  for (const type of ["income", "expense"] as const) {
    const names = [...TRANSACTION_CATEGORIES[type], ...ledger.transactions
      .filter((item) => item.type === type).map((item) => item.category.trim()).filter(Boolean),
      ...(type === "expense" ? ledger.jars.flatMap((jar) => jar.linkedLabels) : [])];
    for (const name of names) {
      if (categories.some((item) => item.id === legacyId(type, name))) continue;
      categories.push({ id: legacyId(type, name), name, type });
    }
  }
  return { ...ledger, categories, transactions: ledger.transactions.map((item) => {
    if (item.categoryId || item.type === "transfer" || !item.category.trim()) return item;
    return { ...item, categoryId: legacyId(item.type, item.category) };
  }) };
}

export function categoriesForType(categories: TransactionCategory[], type: AccountTransaction["type"]) {
  if (type === "transfer") return [];
  return categories.filter((item) => !item.deletedAt && (item.type === type || item.type === "both"));
}

export function applyCategoryCommand(ledger: AccountLedgerData, command: CategoryCommand): AccountLedgerData {
  const current = migrateTransactionCategories(ledger);
  const categories = current.categories ?? [];
  const named = command.kind === "delete" ? "" : command.name.trim();
  if (command.kind !== "delete" && (!named || named.length > 60))
    throw new Error("Tên nhãn cần từ 1 đến 60 ký tự.");
  if (command.kind === "add") {
    if (categories.some((item) => item.id === command.id)) throw new Error("Nhãn đã tồn tại.");
    if (categories.some((item) => !item.deletedAt && item.name.toLocaleLowerCase("vi-VN") === named.toLocaleLowerCase("vi-VN") &&
      (item.type === command.type || item.type === "both" || command.type === "both")))
      throw new Error("Tên nhãn đã được sử dụng.");
    return { ...current, categories: [...categories, { id: command.id, name: named, type: command.type,
      color: command.color, icon: command.icon }] };
  }
  const target = categories.find((item) => item.id === command.id && !item.deletedAt);
  if (!target) throw new Error("Nhãn không còn tồn tại.");
  if (command.kind === "edit") {
    if (categories.some((item) => item.id !== target.id && !item.deletedAt &&
      item.name.toLocaleLowerCase("vi-VN") === named.toLocaleLowerCase("vi-VN") &&
      (item.type === target.type || item.type === "both" || target.type === "both")))
      throw new Error("Tên nhãn đã được sử dụng.");
    return { ...current,
      categories: categories.map((item) => item.id === target.id ? { ...item, name: named,
        color: command.color ?? item.color, icon: command.icon ?? item.icon } : item),
      transactions: current.transactions.map((item) => item.categoryId === target.id ? { ...item, category: named } : item),
      jars: target.type === "income" ? current.jars : current.jars.map((jar) => ({ ...jar,
        linkedLabels: jar.linkedLabels.map((label) => label === target.name ? named : label) })),
    };
  }
  const replacement = command.replacementId ? categories.find((item) => item.id === command.replacementId && !item.deletedAt) : undefined;
  if (command.replacementId && (!replacement || replacement.id === target.id ||
    (replacement.type !== target.type && replacement.type !== "both")))
    throw new Error("Nhãn thay thế không phù hợp.");
  return { ...current,
    categories: categories.map((item) => item.id === target.id ? { ...item, deletedAt: command.now } : item),
    transactions: current.transactions.map((item) => item.categoryId === target.id
      ? { ...item, categoryId: replacement?.id, category: replacement?.name ?? "" } : item),
    jars: target.type === "income" ? current.jars : current.jars.map((jar) => ({ ...jar,
      linkedLabels: jar.linkedLabels.flatMap((label) => label === target.name
        ? replacement ? [replacement.name] : [] : [label]) })),
  };
}

export function resolveCategorySelection(categories: TransactionCategory[], type: AccountTransaction["type"],
  id: string): { category: string; categoryId?: string } {
  if (type === "transfer") return { category: "Chuyển nội bộ" };
  const category = categoriesForType(categories, type).find((item) => item.id === id);
  if (!category) throw new Error("Hãy chọn nhãn còn hiệu lực.");
  return { category: category.name, categoryId: category.id };
}

export function linkTransactionCategory(transaction: AccountTransaction, categories: TransactionCategory[]): AccountTransaction {
  if (transaction.categoryId || transaction.type === "transfer") return transaction;
  const match = categoriesForType(categories, transaction.type).find((item) => item.name === transaction.category);
  return match ? { ...transaction, categoryId: match.id } : transaction;
}
