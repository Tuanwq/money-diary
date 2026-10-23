import { useCallback, useEffect, useMemo } from "react";
import { showAppToast } from "../../../components/feedback/appToast.ts";
import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import type { SavingsCommand } from "../services/savingsService.ts";

type SavingsData = Pick<AccountLedgerData, "accounts" | "transactions" | "jars" | "jarActivities" |
  "savingsRules" | "savingsAllocations">;

export function useSavings(data: SavingsData, dispatch: (command: SavingsCommand) => void,
  today: string, schemaReady: boolean, cloudStatus: string) {
  const { accounts, transactions, jars, jarActivities, savingsRules, savingsAllocations } = data;
  const ledger = useMemo<AccountLedgerData>(() => ({ accounts, transactions, jars, jarActivities,
    savingsRules, savingsAllocations, updatedAt: "" }),
  [accounts, transactions, jars, jarActivities, savingsRules, savingsAllocations]);
  const onCommand = useCallback((command: SavingsCommand) => {
    try { dispatch(command); } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : "Chưa xử lý được tiết kiệm.");
      throw cause;
    }
  }, [dispatch]);

  // Running on foreground/day changes keeps one result per rule and day without a second ledger.
  useEffect(() => {
    if (!schemaReady || !/đồng bộ|thiết bị/i.test(cloudStatus)) return;
    try { dispatch({ type: "refresh", today }); } catch { /* Ledger reports sync readiness. */ }
  }, [cloudStatus, transactions, savingsRules, dispatch, schemaReady, today]);

  return { ledger, onCommand };
}
