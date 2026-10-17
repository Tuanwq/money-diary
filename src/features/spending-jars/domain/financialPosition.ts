import { calculateAccountBalance } from "../../account-ledger/accountLedgerModel.ts";
import { calculateAccountExternalAmount } from "../../account-ledger/accountExternalModel.ts";
import { getJarView, type JarLedger } from "./jarModel.ts";

export type AccountBudgetPosition = {
  accountId: string;
  name: string;
  balance: number;
  outside: number;
  liquid: number;
  reserved: number;
  unallocated: number;
  allocationCapacity: number;
  shortfall: number;
  eligibility: "eligible" | "excluded" | "needs_review";
  jars: Array<{ id: string; name: string; amount: number }>;
};

/** One read model for Dashboard, Accounts and Jars; reservations never add assets. */
export function getFinancialPosition(ledger: JarLedger) {
  const reservedByAccount = new Map<string, number>();
  const jarsByAccount = new Map<string, AccountBudgetPosition["jars"]>();
  for (const jar of ledger.jars) {
    if (jar.status !== "active") continue;
    for (const source of getJarView(ledger, jar).sources) {
      if (source.amount <= 0) continue;
      reservedByAccount.set(source.accountId, (reservedByAccount.get(source.accountId) ?? 0) + source.amount);
      jarsByAccount.set(source.accountId, [...(jarsByAccount.get(source.accountId) ?? []),
        { id: jar.id, name: jar.name, amount: source.amount }]);
    }
  }
  const accounts: AccountBudgetPosition[] = ledger.accounts.filter((account) => !account.archivedAt)
    .map((account) => {
      const balance = calculateAccountBalance(account, ledger.transactions);
      const outside = calculateAccountExternalAmount(account);
      const liquid = Math.max(0, balance - outside);
      const reserved = reservedByAccount.get(account.id) ?? 0;
      const eligibility = account.budgetEligibility ?? "needs_review";
      const jars = jarsByAccount.get(account.id) ?? [];
      return { accountId: account.id, name: account.name, balance, outside, liquid,
        reserved, unallocated: liquid - reserved,
        allocationCapacity: eligibility === "eligible" ? Math.max(0, liquid - reserved) : 0,
        shortfall: Math.max(0, reserved - liquid), eligibility, jars };
    });
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const outside = accounts.reduce((sum, account) => sum + account.outside, 0);
  const activeIds = new Set(accounts.map((account) => account.accountId));
  const orphanedReserved = [...reservedByAccount].reduce((sum, [accountId, amount]) =>
    sum + (activeIds.has(accountId) ? 0 : amount), 0);
  return {
    accounts,
    totalBalance,
    outside,
    liquid: Math.max(0, totalBalance - outside),
    reserved: accounts.reduce((sum, account) => sum + account.reserved, 0) + orphanedReserved,
    orphanedReserved,
    unallocated: accounts.reduce((sum, account) => sum + account.unallocated, 0) - orphanedReserved,
    allocationCapacity: accounts.reduce((sum, account) => sum + account.allocationCapacity, 0),
    shortfall: accounts.reduce((sum, account) => sum + account.shortfall, 0) + orphanedReserved,
    needsReview: accounts.filter((account) => account.eligibility === "needs_review").length,
  };
}

/** Historical shortfalls remain readable; new writes must not deepen them. */
export function assertReservationCoverageAfterLedgerChange(before: JarLedger, after: JarLedger) {
  const beforePosition = getFinancialPosition(before);
  const afterPosition = getFinancialPosition(after);
  if (afterPosition.orphanedReserved > beforePosition.orphanedReserved)
    throw new Error("Không thể ẩn tài khoản đang giữ tiền trong hũ.");
  const previous = new Map(beforePosition.accounts.map((account) => [account.accountId, account.shortfall]));
  for (const account of afterPosition.accounts) {
    if (account.shortfall > (previous.get(account.accountId) ?? 0))
      throw new Error(`Tài khoản ${account.name} không đủ tiền thực có cho các hũ. Hãy giải phóng hoặc chuyển phần đã dành trước.`);
  }
}
