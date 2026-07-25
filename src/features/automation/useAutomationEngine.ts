import { useEffect, useMemo, useRef } from "react";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
} from "../../types";
import type { HubEntry } from "../../types/hub";
import type { AccountTransaction } from "../account-ledger/accountLedgerModel";
import {
  buildAutomationEvents,
  planAutomationExecutions,
  type AutomationExecution,
  type AutomationRule,
} from "./automationModel";

type AutomationEngineParams = {
  balanceChecks: BalanceCheckEntry[];
  commitExecutions: (executions: AutomationExecution[]) => void;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  hubEntries: HubEntry[];
  onLedgerTransaction: (transaction: AccountTransaction) => void;
  onSubGoalContribution: (execution: AutomationExecution) => void;
  processedKeys: string[];
  rules: AutomationRule[];
  validAccountIds: string[];
  validSubGoalIds: string[];
};

export function useAutomationEngine({
  balanceChecks,
  commitExecutions,
  entries,
  expenses,
  hubEntries,
  onLedgerTransaction,
  onSubGoalContribution,
  processedKeys,
  rules,
  validAccountIds,
  validSubGoalIds,
}: AutomationEngineParams) {
  const callbackRef = useRef({
    commitExecutions,
    onLedgerTransaction,
    onSubGoalContribution,
  });
  const executingKeysRef = useRef(new Set<string>());
  const events = useMemo(
    () =>
      buildAutomationEvents({
        balanceChecks,
        entries,
        expenses,
        hubEntries,
      }),
    [balanceChecks, entries, expenses, hubEntries]
  );

  useEffect(() => {
    callbackRef.current = {
      commitExecutions,
      onLedgerTransaction,
      onSubGoalContribution,
    };
  }, [commitExecutions, onLedgerTransaction, onSubGoalContribution]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const executions = planAutomationExecutions({
        events,
        processedKeys: [
          ...processedKeys,
          ...executingKeysRef.current,
        ],
        rules,
      }).filter(
        (execution) =>
          execution.action === "alert" ||
          (execution.action === "ledger"
            ? validAccountIds.includes(execution.targetId)
            : validSubGoalIds.includes(execution.targetId))
      );

      if (executions.length === 0) return;

      executions.forEach((execution) => {
        executingKeysRef.current.add(execution.idempotencyKey);

        if (execution.action === "ledger") {
          const now = new Date().toISOString();

          callbackRef.current.onLedgerTransaction({
            accountId: execution.targetId,
            amount: execution.amount,
            category: `Tự động · ${execution.ruleName}`,
            createdAt: now,
            date: execution.date,
            id: `automation:${execution.idempotencyKey}`,
            note: execution.title,
            type: execution.direction,
            updatedAt: now,
          });
        } else if (execution.action === "subgoal") {
          callbackRef.current.onSubGoalContribution(execution);
        }
      });

      callbackRef.current.commitExecutions(executions);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [events, processedKeys, rules, validAccountIds, validSubGoalIds]);
}
