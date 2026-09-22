import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { safeSetStorageJson } from "../../utils/safeStorage";
import type { ExpenseBudget } from "../../types.ts";
import { applyJarCommand, type JarCommand } from "../spending-jars/services/jarService.ts";
import { getAccountAllocation, migrateExpenseBudgets } from "../spending-jars/domain/jarModel.ts";
import { reconcileJarLedger } from "./reconcileJarLedger.ts";
import {
  ACCOUNT_LEDGER_STORAGE_KEY,
  createDefaultLedger,
  isAccountLedgerData,
  type AccountLedgerData,
  type AccountTransaction,
  type FinancialAccount,
} from "./accountLedgerModel";

function loadLocalLedger() {
  try {
    const saved = localStorage.getItem(ACCOUNT_LEDGER_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : null;

    return isAccountLedgerData(parsed) ? {
      ...parsed, jars: Array.isArray(parsed.jars) ? parsed.jars : [],
      jarActivities: Array.isArray(parsed.jarActivities) ? parsed.jarActivities : [],
    } : createDefaultLedger();
  } catch {
    return createDefaultLedger();
  }
}

export function useAccountLedger(userId?: string, legacyBudgets: ExpenseBudget[] = []) {
  const [ledger, setLedger] = useState<AccountLedgerData>(loadLocalLedger);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const [jarSchemaReady, setJarSchemaReady] = useState(true);
  const dirtyRef = useRef(false);
  const latestLedgerRef = useRef(ledger);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    latestLedgerRef.current = ledger;
    safeSetStorageJson(ACCOUNT_LEDGER_STORAGE_KEY, ledger);
  }, [ledger]);

  useEffect(() => {
    if (!userId) {
      const timeout = window.setTimeout(() => {
        setCloudReady(false);
        setCloudStatus("Đang lưu trên thiết bị");
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setCloudStatus("Đang tải sổ tài khoản...");

      let { data, error } = await supabase
        .from("money_diary_account_ledgers")
        .select("accounts, transactions, jars, jar_activities, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      let schemaAvailable = true;
      if (error && /jars|jar_activities/i.test(error.message)) {
        const fallback = await supabase.from("money_diary_account_ledgers")
          .select("accounts, transactions, updated_at")
          .eq("user_id", userId).maybeSingle();
        if (!active) return;
        data = fallback.data as typeof data;
        error = fallback.error;
        schemaAvailable = false;
        setJarSchemaReady(false);
      } else {
        setJarSchemaReady(true);
      }

      if (error) {
        console.error(error);
        setCloudStatus("Chưa thể đồng bộ sổ tài khoản");
        return;
      }

      const cloudLedger: AccountLedgerData | null = data
        ? {
            accounts: (data.accounts ?? []) as unknown as FinancialAccount[],
            transactions: (data.transactions ??
              []) as unknown as AccountTransaction[],
            jars: (data.jars ?? []) as AccountLedgerData["jars"],
            jarActivities: (data.jar_activities ?? []) as AccountLedgerData["jarActivities"],
            updatedAt: data.updated_at,
          }
        : null;
      const localLedger = latestLedgerRef.current;
      const recoveredLedger = schemaAvailable && cloudLedger
        ? reconcileJarLedger(localLedger, cloudLedger) : cloudLedger;
      const hasRecoveredJars = recoveredLedger !== cloudLedger;
      const shouldUseCloud =
        cloudLedger &&
        !hasRecoveredJars &&
        (schemaAvailable || (localLedger.jars.length === 0 && localLedger.jarActivities.length === 0)) &&
        new Date(cloudLedger.updatedAt).getTime() >
          new Date(localLedger.updatedAt).getTime();
      const nextLedger = hasRecoveredJars ? recoveredLedger! : shouldUseCloud ? cloudLedger : localLedger;

      if (nextLedger !== localLedger) {
        latestLedgerRef.current = nextLedger;
        setLedger(nextLedger);
      }

      if (!schemaAvailable) {
        setCloudReady(true);
        setCloudStatus("Hũ đang lưu trên thiết bị · cần áp dụng migration Supabase");
        return;
      }

      const { error: upsertError } = await supabase
        .from("money_diary_account_ledgers")
        .upsert({
          accounts: nextLedger.accounts,
          transactions: nextLedger.transactions,
          jars: nextLedger.jars,
          jar_activities: nextLedger.jarActivities,
          updated_at: nextLedger.updatedAt,
          user_id: userId,
        });

      if (!active) return;

      if (upsertError) {
        console.error(upsertError);
        setCloudStatus("Chưa thể đồng bộ sổ tài khoản");
        return;
      }

      dirtyRef.current = latestLedgerRef.current !== nextLedger;
      setCloudReady(true);
      setCloudStatus(dirtyRef.current ? "Đang lưu sổ tài khoản..." : "Sổ tài khoản đã đồng bộ");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !jarSchemaReady || !dirtyRef.current) return;

    const timeout = window.setTimeout(() => {
      // Serialize whole-ledger upserts. A slower earlier request must never
      // overwrite a newer jar spend (transactions + source allocation).
      saveChainRef.current = saveChainRef.current.catch(() => undefined).then(async () => {
        const current = latestLedgerRef.current;
        if (!dirtyRef.current) return;
        setCloudStatus("Đang lưu sổ tài khoản...");
        const { error } = await supabase.from("money_diary_account_ledgers").upsert({
          accounts: current.accounts,
          transactions: current.transactions,
          jars: current.jars,
          jar_activities: current.jarActivities,
          updated_at: current.updatedAt,
          user_id: userId,
        });
        if (error) {
          console.error(error);
          setCloudStatus("Lỗi lưu sổ tài khoản");
          return;
        }
        if (latestLedgerRef.current === current) {
          dirtyRef.current = false;
          setCloudStatus("Sổ tài khoản đã đồng bộ");
        }
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, jarSchemaReady, ledger, userId]);

  const updateLedger = useCallback(
    (
      updater: (current: AccountLedgerData) => Pick<
        AccountLedgerData,
        "accounts" | "transactions"
      >
    ) => {
      const current = latestLedgerRef.current;
      const next = { ...current, ...updater(current), updatedAt: new Date().toISOString() };
      if (!safeSetStorageJson(ACCOUNT_LEDGER_STORAGE_KEY, next))
        throw new Error("Thiết bị chưa lưu được sổ tài khoản. Hãy giải phóng bộ nhớ hoặc bật đồng bộ trước khi thử lại.");
      dirtyRef.current = true;
      latestLedgerRef.current = next;
      setLedger(next);
    },
    []
  );

  useEffect(() => {
    if (userId && !cloudReady) return;
    const next = migrateExpenseBudgets(latestLedgerRef.current, legacyBudgets, new Date().toISOString());
    if (next !== latestLedgerRef.current) updateLedger(() => next);
  }, [cloudReady, legacyBudgets, updateLedger, userId]);

  const dispatchJar = useCallback((command: JarCommand) => {
    const next = applyJarCommand(latestLedgerRef.current, command);
    if (next !== latestLedgerRef.current) updateLedger(() => next);
  }, [updateLedger]);

  const saveAccount = useCallback(
    (account: FinancialAccount) => {
      updateLedger((current) => ({
        accounts: current.accounts.some((item) => item.id === account.id)
          ? current.accounts.map((item) =>
              item.id === account.id ? account : item
            )
          : [...current.accounts, account],
        transactions: current.transactions,
      }));
    },
    [updateLedger]
  );

  const archiveAccount = useCallback(
    (accountId: string) => {
      if (getAccountAllocation(latestLedgerRef.current, accountId) > 0)
        throw new Error("Tài khoản còn tiền trong hũ. Hãy giải phóng hoặc chuyển phần phân bổ trước khi ẩn.");
      const now = new Date().toISOString();

      updateLedger((current) => ({
        accounts: current.accounts.map((account) =>
          account.id === accountId
            ? { ...account, archivedAt: now, updatedAt: now }
            : account
        ),
        transactions: current.transactions,
      }));
    },
    [updateLedger]
  );

  const saveTransaction = useCallback(
    (transaction: AccountTransaction) => {
      if (latestLedgerRef.current.transactions.some((item) => item.id === transaction.id && item.jarActivityId))
        throw new Error("Giao dịch từ hũ cần được sửa trong chi tiết hũ để giữ đúng nguồn tiền.");
      updateLedger((current) => ({
        accounts: current.accounts,
        transactions: current.transactions.some(
          (item) => item.id === transaction.id
        )
          ? current.transactions.map((item) =>
              item.id === transaction.id ? transaction : item
            )
          : [transaction, ...current.transactions],
      }));
    },
    [updateLedger]
  );

  const deleteTransaction = useCallback(
    (transactionId: string) => {
      updateLedger((current) => {
        const target = current.transactions.find((item) => item.id === transactionId);
        const groupId = target?.jarActivityId;
        return {
          accounts: current.accounts,
          transactions: current.transactions.filter((item) => groupId
            ? item.jarActivityId !== groupId : item.id !== transactionId),
          jarActivities: groupId
            ? current.jarActivities.filter((item) => item.id !== groupId)
            : current.jarActivities,
        };
      });
    },
    [updateLedger]
  );

  const replaceLedger = useCallback(
    (accounts: FinancialAccount[], transactions: AccountTransaction[],
      jars: AccountLedgerData["jars"] = [], jarActivities: AccountLedgerData["jarActivities"] = []) => {
      updateLedger(() => ({ accounts, transactions, jars, jarActivities }));
    },
    [updateLedger]
  );

  return {
    accounts: ledger.accounts,
    archiveAccount,
    cloudStatus,
    deleteTransaction,
    dispatchJar,
    jars: ledger.jars,
    jarActivities: ledger.jarActivities,
    replaceLedger,
    saveAccount,
    saveTransaction,
    transactions: ledger.transactions,
  };
}
