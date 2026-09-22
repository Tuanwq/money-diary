import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { safeSetStorageJson } from "../../utils/safeStorage";
import type { ExpenseBudget } from "../../types.ts";
import { applyJarCommand, type JarCommand } from "../spending-jars/services/jarService.ts";
import { getAccountAllocation, migrateExpenseBudgets } from "../spending-jars/domain/jarModel.ts";
import { decideLedgerLoad, hasLocalOnlyRecords, nextLedgerTimestamp } from "./ledgerSync.ts";
import {
  ACCOUNT_LEDGER_STORAGE_KEY,
  createDefaultLedger,
  isAccountLedgerData,
  type AccountLedgerData,
  type AccountTransaction,
  type FinancialAccount,
} from "./accountLedgerModel";

const PENDING_LEDGER_KEY = `${ACCOUNT_LEDGER_STORAGE_KEY}:pending`;
const RECOVERY_LEDGER_KEY = `${ACCOUNT_LEDGER_STORAGE_KEY}:recovery`;
type PendingLedger = { userId: string; baseUpdatedAt: string | null };

function readPendingLedger(): PendingLedger | null {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_LEDGER_KEY) ?? "null") as PendingLedger | null;
    return value && typeof value.userId === "string" &&
      (typeof value.baseUpdatedAt === "string" || value.baseUpdatedAt === null) ? value : null;
  } catch { return null; }
}

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
  const [retryIndex, setRetryIndex] = useState(0);
  const dirtyRef = useRef(false);
  const pendingRef = useRef<PendingLedger | null>(readPendingLedger());
  const baseUpdatedAtRef = useRef<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const latestLedgerRef = useRef(ledger);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    latestLedgerRef.current = ledger;
    safeSetStorageJson(ACCOUNT_LEDGER_STORAGE_KEY, ledger);
  }, [ledger]);

  useEffect(() => {
    if (!userId) {
      const timeout = window.setTimeout(() => {
        loadedUserRef.current = null;
        baseUpdatedAtRef.current = null;
        setCloudReady(false);
        setCloudStatus("Đang lưu trên thiết bị");
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      // Foreground checks only fetch the revision first. On iOS/4G the JSONB
      // ledger can be large, but most checks find no remote change.
      const cachedRevision = baseUpdatedAtRef.current;
      if (loadedUserRef.current === userId && cachedRevision && !dirtyRef.current &&
        pendingRef.current?.userId !== userId) {
        const revisionResult = await supabase.from("money_diary_account_ledgers")
          .select("updated_at").eq("user_id", userId).maybeSingle();
        if (!active) return;
        if (revisionResult.error) {
          console.error(revisionResult.error);
          setCloudStatus("Chưa thể đồng bộ sổ tài khoản");
          return;
        }
        if (revisionResult.data?.updated_at === cachedRevision) {
          setCloudReady(true);
          setCloudStatus("Sổ tài khoản đã đồng bộ");
          return;
        }
      }
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
      if (!schemaAvailable) {
        setCloudReady(false);
        setCloudStatus("Hũ đang lưu trên thiết bị · cần áp dụng migration Supabase");
        return;
      }
      const localLedger = latestLedgerRef.current;
      const pending = pendingRef.current?.userId === userId ? pendingRef.current : null;
      baseUpdatedAtRef.current = cloudLedger?.updatedAt ?? null;
      loadedUserRef.current = userId;
      const decision = decideLedgerLoad(localLedger, cloudLedger, pending?.baseUpdatedAt);
      if (decision === "conflict") {
        setCloudReady(false);
        setCloudStatus("Xung đột đồng bộ sổ tài khoản · bản cloud đã thay đổi");
        return;
      }
      if (decision === "pending") {
        dirtyRef.current = true;
        setCloudReady(true);
        setCloudStatus("Đang lưu sổ tài khoản...");
        return;
      }
      if (decision === "cloud" && cloudLedger) {
        // The cloud is authoritative on a clean device. Old local jars are not
        // interpreted as missing cloud data: they may have been deleted elsewhere.
        if (hasLocalOnlyRecords(localLedger, cloudLedger) &&
          !safeSetStorageJson(`${RECOVERY_LEDGER_KEY}:${userId}`, localLedger)) {
          setCloudReady(false);
          setCloudStatus("Chưa thể lưu bản sao trên thiết bị trước khi tải dữ liệu cloud");
          return;
        }
        dirtyRef.current = false;
        latestLedgerRef.current = cloudLedger;
        setLedger(cloudLedger);
        setCloudReady(true);
        setCloudStatus("Sổ tài khoản đã đồng bộ");
        return;
      }
      if (decision === "empty") {
        dirtyRef.current = false;
        setCloudReady(true);
        setCloudStatus("Sổ tài khoản đã đồng bộ");
        return;
      }
      // Existing local-only ledgers can be uploaded when this user has no row.
      const initialPending = { userId, baseUpdatedAt: null };
      if (!safeSetStorageJson(PENDING_LEDGER_KEY, initialPending)) {
        setCloudStatus("Chưa thể lưu trạng thái đồng bộ trên thiết bị");
        return;
      }
      pendingRef.current = initialPending;
      dirtyRef.current = true;
      setCloudReady(true);
      setCloudStatus("Đang lưu sổ tài khoản...");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId, retryIndex]);

  const retrySync = useCallback(() => {
    setCloudReady(false);
    setRetryIndex((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && cloudReady && !dirtyRef.current) retrySync();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, [cloudReady, userId, retrySync]);

  const useCloudVersion = useCallback(() => {
    if (!userId) return;
    if (!safeSetStorageJson(`${RECOVERY_LEDGER_KEY}:${userId}`, latestLedgerRef.current))
      throw new Error("Chưa lưu được bản sao trên thiết bị.");
    localStorage.removeItem(PENDING_LEDGER_KEY);
    pendingRef.current = null;
    dirtyRef.current = false;
    loadedUserRef.current = null;
    retrySync();
  }, [retrySync, userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !jarSchemaReady || !dirtyRef.current) return;

    const timeout = window.setTimeout(() => {
      // Serialize writes and compare the remote revision. A stale device must
      // never bring back a jar removed by another device.
      saveChainRef.current = saveChainRef.current.catch(() => undefined).then(async () => {
        const current = latestLedgerRef.current;
        if (!dirtyRef.current || loadedUserRef.current !== userId ||
          pendingRef.current?.userId !== userId) return;
        setCloudStatus("Đang lưu sổ tài khoản...");
        const payload = {
          accounts: current.accounts,
          transactions: current.transactions,
          jars: current.jars,
          jar_activities: current.jarActivities,
          updated_at: current.updatedAt,
        };
        const expected = baseUpdatedAtRef.current;
        const { data, error } = expected === null
          ? await supabase.from("money_diary_account_ledgers")
              .insert({ ...payload, user_id: userId }).select("updated_at").maybeSingle()
          : await supabase.from("money_diary_account_ledgers")
              .update(payload).eq("user_id", userId).eq("updated_at", expected)
              .select("updated_at").maybeSingle();
        if (error) {
          console.error(error);
          setCloudStatus(error.code === "23505"
            ? "Xung đột đồng bộ sổ tài khoản · bản cloud đã thay đổi"
            : "Lỗi lưu sổ tài khoản");
          return;
        }
        if (!data) {
          setCloudReady(false);
          setCloudStatus("Xung đột đồng bộ sổ tài khoản · bản cloud đã thay đổi");
          return;
        }
        baseUpdatedAtRef.current = data.updated_at;
        if (latestLedgerRef.current === current) {
          dirtyRef.current = false;
          pendingRef.current = null;
          localStorage.removeItem(PENDING_LEDGER_KEY);
          setCloudStatus("Sổ tài khoản đã đồng bộ");
        } else {
          const nextPending = { userId, baseUpdatedAt: data.updated_at };
          pendingRef.current = nextPending;
          safeSetStorageJson(PENDING_LEDGER_KEY, nextPending);
        }
      });
    }, 300);

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
      const next = { ...current, ...updater(current), updatedAt: nextLedgerTimestamp(current.updatedAt) };
      if (!safeSetStorageJson(ACCOUNT_LEDGER_STORAGE_KEY, next))
        throw new Error("Thiết bị chưa lưu được sổ tài khoản. Hãy giải phóng bộ nhớ hoặc bật đồng bộ trước khi thử lại.");
      if (userId) {
        const pending = pendingRef.current?.userId === userId
          ? pendingRef.current : { userId, baseUpdatedAt: baseUpdatedAtRef.current };
        if (!safeSetStorageJson(PENDING_LEDGER_KEY, pending))
          throw new Error("Thiết bị chưa lưu được trạng thái đồng bộ.");
        pendingRef.current = pending;
      }
      dirtyRef.current = true;
      latestLedgerRef.current = next;
      setLedger(next);
      setCloudStatus(userId ? "Đang lưu sổ tài khoản..." : "Đang lưu trên thiết bị");
    },
    [userId]
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
    retrySync,
    useCloudVersion,
    saveAccount,
    saveTransaction,
    transactions: ledger.transactions,
  };
}
