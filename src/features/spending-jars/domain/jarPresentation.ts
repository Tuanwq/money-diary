import { getJarBudgetRange, getJarBudgetView, getJarView,
  type JarLedger, type SpendingJar } from "./jarModel.ts";
import { getFinancialPosition } from "./financialPosition.ts";

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

/** The allocation denominator contains only money already reserved or eligible for a new reservation. */
export function getJarOverviewPresentation(ledger: JarLedger) {
  const position = getFinancialPosition(ledger);
  const allocatedAmount = Math.max(0, position.reserved);
  const unallocatedAmount = Math.max(0, position.allocationCapacity);
  const totalAllocatableAmount = allocatedAmount + unallocatedAmount;
  const allocationPercent = totalAllocatableAmount > 0
    ? Math.min(100, Math.round(allocatedAmount / totalAllocatableAmount * 100)) : 0;
  const spentFromActiveJars = ledger.jars.filter((jar) => jar.status === "active")
    .reduce((sum, jar) => sum + Math.max(0, getJarView(ledger, jar).spentAmount), 0);
  return { position, allocatedAmount, unallocatedAmount, totalAllocatableAmount,
    allocationPercent, spentFromActiveJars };
}

export function getJarDetailPresentation(ledger: JarLedger, jar: SpendingJar, asOfDate: string) {
  const view = getJarView(ledger, jar);
  const budget = getJarBudgetView(ledger, jar, asOfDate);
  const period = jar.budgetPeriod ?? "legacy_total";
  const { fromDate, toDate } = getJarBudgetRange(jar, asOfDate);
  const daysRemaining = period === "legacy_total" || (period === "custom" && !jar.endDate)
    ? null : Math.max(0, dayNumber(toDate) - dayNumber(asOfDate > fromDate ? asOfDate : fromDate) + 1);
  const heldAmount = Math.max(0, view.remainingAmount);
  const fundingDifference = heldAmount - budget.remaining;
  const budgetUsedPercent = Math.min(100, Math.max(0, budget.usedPercent));
  const budgetRemainingPercent = jar.limitAmount > 0
    ? Math.min(100, Math.max(0, Math.round(budget.remaining / jar.limitAmount * 100))) : 0;
  const status = jar.status === "closed" ? "closed"
    : view.deficitAmount > 0 ? "source_shortfall"
      : budget.overage > 0 ? "over_budget"
        : budget.usedPercent >= 80 ? "low_budget"
          : daysRemaining !== null && daysRemaining <= 3 ? "period_ending"
            : heldAmount === 0 ? "unfunded" : "active";
  const priority = ({ source_shortfall: 0, over_budget: 0, low_budget: 1,
    period_ending: 2, active: 3, unfunded: 4, closed: 5 })[status];
  return { jar, view, budget, period, heldAmount, fundingDifference,
    budgetUsedPercent, budgetRemainingPercent, daysRemaining,
    suggestedDailyLimit: daysRemaining && daysRemaining > 0
      ? Math.floor(budget.remaining / daysRemaining) : null,
    status, priority };
}
