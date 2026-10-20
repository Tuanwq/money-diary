import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { safeSetStorageJson } from "../../utils/safeStorage";
import { captureAppError } from "../error-monitoring/appErrorMonitor";
import type { ExpenseBudget } from "../../types.ts";
import { applyJarCommand, type JarCommand } from "../spending-jars/services/jarService.ts";
import { repairClosedJars } from "../spending-jars/services/closedJarMigration.ts";
import { getAccountAllocation, migrateExpenseBudgets } from "../spending-jars/domain/jarModel.ts";
import { assertReservationCoverageAfterLedgerChange } from "../spending-jars/domain/financialPosition.ts";
import { areLedgerContentsEqual, decideLedgerLoad, hasLocalOnlyRecords, isPristineLedger,
  nextLedgerTimestamp } from "./ledgerSync.ts";
import { PENDING_LEDGER_KEY, ledgerKey, pendingKey, selectLocalLedgerValue } from "./ledgerStorageScope.ts";
import { describeLedgerCloudError } from "./ledgerCloudError.ts";
import { applyCategoryCommand, linkTransactionCategory, migrateTransactionCategories, type CategoryCommand } from "./transactionCategories.ts";
import { applyAccountExternalCommand, assertExternalCoverageAfterLedgerChange,
  calculateAccountExternalAmount, type AccountExternalCommand } from "./accountExternalModel.ts";
import { applyDebtCommand, getDebtRemaining, type DebtCommand } from "./debtModel.ts";
import {
  ACCOUNT_LEDGER_STORAGE_KEY,
  createDefaultLedger,
  isAccountLedgerData,
  type AccountLedgerData,
  type AccountTransaction,
  type FinancialAccount,
} from "./accountLedgerModel";

const RECOVERY_LEDGER_KEY = `${ACCOUNT_LEDGER_STORAGE_KEY}:recovery`;
const EMPTY_LEGACY_BUDGETS: ExpenseBudget[] = [];
type PendingLedger = { userId: string; baseUpdatedAt: string | null };

function readPendingLedger(userId?: string): PendingLedger | null {
  try {
    const value = JSON.parse(localStorage.getItem(pendingKey(userId)) ??
      (userId ? localStorage.getItem(PENDING_LEDGER_KEY) : null) ?? "null") as PendingLedger | null;
    return value && typeof value.userId === "string" &&
      (!userId || value.userId === userId) &&
      (typeof value.baseUpdatedAt === "string" || value.baseUpdatedAt === null) ? value : null;
  } catch { return null; }
}

function clearPendingLedger(userId: string) {
  localStorage.removeItem(pendingKey(userId));
  try {
    const legacy = JSON.parse(localStorage.getItem(PENDING_LEDGER_KEY) ?? "null") as PendingLedger | null;
    if (legacy?.userId === userId) localStorage.removeItem(PENDING_LEDGER_KEY);
  } catch { /* An invalid legacy marker never authorizes an upload. */ }
}

function loadLocalLedger(userId?: string) {
  try {
    // The old unscoped cache is adopted only with a matching pending owner.
    // Never infer ownership from the financial data itself.
    const saved = selectLocalLedgerValue(userId, localStorage.getItem(ledgerKey(userId)),
      localStorage.getItem(ACCOUNT_LEDGER_STORAGE_KEY), readPendingLedger(userId)?.userId ?? null);
    const parsed = saved ? (JSON.parse(saved) as unknown) : null;

    return isAccountLedgerData(parsed) ? {
      ...parsed, jars: Array.isArray(parsed.jars) ? parsed.jars : [],
      jarActivities: Array.isArray(parsed.jarActivities) ? parsed.jarActivities : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
    } : createDefaultLedger();
  } catch {
    return createDefaultLedger();
  }
}

export function useAccountLedger(userId?: string, legacyBudgets: ExpenseBudget[] = EMPTY_LEGACY_BUDGETS) {
  const [ledger, setLedger] = useState<AccountLedgerData>(() => loadLocalLedger(userId));
  const [ledgerOwner, setLedgerOwner] = useState(userId ?? null);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const [jarSchemaReady, setJarSchemaReady] = useState(true);
  const [categorySchemaReady, setCategorySchemaReady] = useState(true);
  const [debtSchemaReady, setDebtSchemaReady] = useState(true);
  const [legacyRecovery, setLegacyRecovery] = useState<{
    userId: string; accounts: number; transactions: number; jars: number;
  } | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);
  const dirtyRef = useRef(false);
  const pendingRef = useRef<PendingLedger | null>(readPendingLedger(userId));
  const baseUpdatedAtRef = useRef<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const latestLedgerRef = useRef(ledger);
  const ownerRef = useRef(userId ?? null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (ownerRef.current === (userId ?? null)) return;
    const next = loadLocalLedger(userId);
    ownerRef.current = userId ?? null;
    latestLedgerRef.current = next;
    pendingRef.current = readPendingLedger(userId);
    dirtyRef.current = Boolean(pendingRef.current);
    baseUpdatedAtRef.current = null;
    loadedUserRef.current = null;
    setCloudReady(false);
    setLedgerOwner(userId ?? null);
    setLedger(next);
  }, [userId]);

  useEffect(() => {
    if (ledgerOwner !== (userId ?? null)) return;
    latestLedgerRef.current = ledger;
    safeSetStorageJson(ledgerKey(userId), ledger);
  }, [ledger, ledgerOwner, userId]);

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
          const record = captureAppError({ category: "sync", message: "Không thể kiểm tra sổ tài khoản trên cloud",
            detail: `${revisionResult.error.code}: ${revisionResult.error.message}` });
          setCloudStatus(`Chưa thể đồng bộ sổ tài khoản · ${describeLedgerCloudError(revisionResult.error)} · ${record.code}`);
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
        .select("accounts, transactions, jars, jar_activities, categories, debts, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      let schemaAvailable = true;
      if (error && /debts/i.test(error.message)) {
        setDebtSchemaReady(false);
        setCloudReady(false);
        setCloudStatus("Công nợ chưa đồng bộ · cần áp dụng migration Supabase");
        return;
      }
      setDebtSchemaReady(true);
      if (error && /categories/i.test(error.message)) {
        setCategorySchemaReady(false);
        setCloudReady(false);
        setCloudStatus("Nhãn chưa đồng bộ · cần áp dụng migration Supabase");
        return;
      }
      setCategorySchemaReady(true);
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
        const record = captureAppError({ category: "sync", message: "Không thể tải sổ tài khoản từ cloud",
          detail: `${error.code}: ${error.message}` });
        setCloudStatus(`Chưa thể đồng bộ sổ tài khoản · ${describeLedgerCloudError(error)} · ${record.code}`);
        return;
      }

      const cloudLedger: AccountLedgerData | null = data
        ? {
            accounts: (data.accounts ?? []) as unknown as FinancialAccount[],
            transactions: (data.transactions ??
              []) as unknown as AccountTransaction[],
            jars: (data.jars ?? []) as AccountLedgerData["jars"],
            jarActivities: (data.jar_activities ?? []) as AccountLedgerData["jarActivities"],
            categories: (data.categories ?? []) as AccountLedgerData["categories"],
            debts: (data.debts ?? []) as AccountLedgerData["debts"],
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
        if (cloudLedger && areLedgerContentsEqual(localLedger, cloudLedger)) {
          if (!safeSetStorageJson(ledgerKey(userId), cloudLedger)) {
            setCloudStatus("Chưa thể lưu bản cloud trên thiết bị · hãy kiểm tra dung lượng");
            return;
          }
          clearPendingLedger(userId);
          pendingRef.current = null;
          dirtyRef.current = false;
          latestLedgerRef.current = cloudLedger;
          setLedger(cloudLedger);
          setCloudReady(true);
          setCloudStatus("Sổ tài khoản đã đồng bộ");
          return;
        }
        setCloudReady(false);
        setCloudStatus("Xung đột đồng bộ sổ tài khoản · dữ liệu trên máy và cloud khác nhau · mở Tài khoản để xử lý");
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
      if (!safeSetStorageJson(pendingKey(userId), initialPending)) {
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
      if (document.visibilityState === "visible" &&
        ((cloudReady && !dirtyRef.current) || /chưa thể|lỗi/i.test(cloudStatus))) retrySync();
    };
    const resumeOnline = () => retrySync();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", resumeOnline);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", resumeOnline);
      window.clearInterval(interval);
    };
  }, [cloudReady, cloudStatus, userId, retrySync]);

  const useCloudVersion = useCallback(() => {
    if (!userId) return;
    if (!safeSetStorageJson(`${RECOVERY_LEDGER_KEY}:${userId}`, latestLedgerRef.current))
      throw new Error("Chưa lưu được bản sao trên thiết bị.");
    clearPendingLedger(userId);
    pendingRef.current = null;
    dirtyRef.current = false;
    loadedUserRef.current = null;
    retrySync();
  }, [retrySync, userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !jarSchemaReady || !categorySchemaReady || !debtSchemaReady || !dirtyRef.current) return;

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
          categories: current.categories ?? [],
          debts: current.debts ?? [],
          updated_at: current.updatedAt,
        };
        const expected = baseUpdatedAtRef.current;
        const { data, error } = expected === null
          ? await supabase.from("money_diary_account_ledgers")
              .insert({ ...payload, user_id: userId }).select("updated_at").maybeSingle()
          : await supabase.from("money_diary_account_ledgers")
              .update(payload).eq("user_id", userId).eq("updated_at", expected)
              .select("updated_at").maybeSingle();
        if (ownerRef.current !== userId) return;
        if (error) {
          console.error(error);
          const record = captureAppError({ category: "sync", message: "Không thể lưu sổ tài khoản lên cloud",
            detail: `${error.code}: ${error.message}` });
          setCloudStatus(error.code === "23505"
            ? "Xung đột đồng bộ sổ tài khoản · bản cloud đã thay đổi"
            : `Lỗi lưu sổ tài khoản · ${describeLedgerCloudError(error)} · ${record.code}`);
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
          clearPendingLedger(userId);
          setCloudStatus("Sổ tài khoản đã đồng bộ");
        } else {
          const nextPending = { userId, baseUpdatedAt: data.updated_at };
          pendingRef.current = nextPending;
          safeSetStorageJson(pendingKey(userId), nextPending);
        }
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, jarSchemaReady, categorySchemaReady, debtSchemaReady, ledger, userId]);

  const updateLedger = useCallback(
    (
      updater: (current: AccountLedgerData) => Pick<
        AccountLedgerData,
        "accounts" | "transactions"
      >,
      allowExternalShortfall = false
    ) => {
      const current = latestLedgerRef.current;
      if (ownerRef.current !== (userId ?? null))
        throw new Error("Đang chuyển tài khoản. Hãy thử lại sau khi sổ được tải.");
      const next = { ...current, ...updater(current), updatedAt: nextLedgerTimestamp(current.updatedAt) };
      if (!allowExternalShortfall) {
        assertExternalCoverageAfterLedgerChange(current, next);
        assertReservationCoverageAfterLedgerChange(current, next);
      }
      // Persist the pending marker first. A local write that succeeds without
      // this marker could otherwise be replaced by an older cloud revision.
      let pending: PendingLedger | null = null;
      if (userId) {
        pending = pendingRef.current?.userId === userId
          ? pendingRef.current : { userId, baseUpdatedAt: baseUpdatedAtRef.current };
        if (!safeSetStorageJson(pendingKey(userId), pending))
          throw new Error("Thiết bị chưa lưu được trạng thái đồng bộ.");
      }
      if (!safeSetStorageJson(ledgerKey(userId), next))
        throw new Error("Thiết bị chưa lưu được sổ tài khoản. Hãy giải phóng bộ nhớ hoặc bật đồng bộ trước khi thử lại.");
      if (pending) pendingRef.current = pending;
      dirtyRef.current = true;
      latestLedgerRef.current = next;
      setLedger(next);
      setCloudStatus(userId ? "Đang lưu sổ tài khoản..." : "Đang lưu trên thiết bị");
    },
    [userId]
  );

  useEffect(() => {
    if (userId && !cloudReady) return;
    const now = new Date().toISOString();
    const current = latestLedgerRef.current;
    const repaired = repairClosedJars(current, now);
    const next = migrateExpenseBudgets(repaired, legacyBudgets, now);
    const withCategories = migrateTransactionCategories(next === current ? current : { ...current, ...next });
    if (withCategories !== current) updateLedger(() => withCategories);
  }, [cloudReady, legacyBudgets, updateLedger, userId]);

  const dispatchCategory = useCallback((command: CategoryCommand) => {
    const next = applyCategoryCommand(latestLedgerRef.current, command);
    updateLedger(() => next);
  }, [updateLedger]);

  const dispatchJar = useCallback((command: JarCommand) => {
    const current = latestLedgerRef.current;
    const next = applyJarCommand(current, command);
    if (next !== current) {
      const withCategories = migrateTransactionCategories({ ...current, ...next });
      updateLedger(() => ({ ...withCategories,
        transactions: withCategories.transactions.map((item) =>
          linkTransactionCategory(item, withCategories.categories ?? [])) }));
    }
  }, [updateLedger]);

  const dispatchExternal = useCallback((command: AccountExternalCommand) => {
    const next = applyAccountExternalCommand(latestLedgerRef.current, command);
    if (next !== latestLedgerRef.current) updateLedger(() => next);
  }, [updateLedger]);

  const dispatchDebt = useCallback((command: DebtCommand) => {
    if (userId && (!cloudReady || !debtSchemaReady || loadedUserRef.current !== userId))
      throw new Error("Công nợ chưa sẵn sàng đồng bộ. Hãy kiểm tra kết nối hoặc áp dụng migration Supabase.");
    const current = latestLedgerRef.current;
    const next = applyDebtCommand(current, command);
    if (next !== current) updateLedger(() => next);
  }, [cloudReady, debtSchemaReady, updateLedger, userId]);

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
      const account = latestLedgerRef.current.accounts.find((item) => item.id === accountId);
      if (account && calculateAccountExternalAmount(account) > 0)
        throw new Error("Tài khoản còn tiền đang ở ngoài. Hãy thu hồi hoặc chuyển khoản phải thu trước khi ẩn.");
      if (latestLedgerRef.current.debts?.some((debt) => getDebtRemaining(debt) > 0 &&
        debt.originAccountId === accountId))
        throw new Error("Tài khoản còn khoản công nợ chưa tất toán. Hãy xử lý khoản nợ trước khi ẩn.");
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
      if (transaction.type === "debt" || latestLedgerRef.current.transactions.some((item) => item.id === transaction.id && item.debtId))
        throw new Error("Giao dịch công nợ cần được sửa trong chi tiết khoản nợ.");
      updateLedger((current) => ({
        accounts: current.accounts,
        transactions: current.transactions.some(
          (item) => item.id === transaction.id
        )
          ? current.transactions.map((item) =>
              item.id === transaction.id ? linkTransactionCategory(transaction, current.categories ?? []) : item
            )
          : [linkTransactionCategory(transaction, current.categories ?? []), ...current.transactions],
      }));
    },
    [updateLedger]
  );

  const deleteTransaction = useCallback(
    (transactionId: string) => {
      updateLedger((current) => {
        const target = current.transactions.find((item) => item.id === transactionId);
        if (target?.debtId) throw new Error("Hãy hoàn tác giao dịch trong chi tiết khoản công nợ.");
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
      jars: AccountLedgerData["jars"] = [], jarActivities: AccountLedgerData["jarActivities"] = [],
      categories?: AccountLedgerData["categories"], debts: AccountLedgerData["debts"] = []) => {
      updateLedger(() => ({ accounts, transactions, jars, jarActivities, categories, debts }), true);
    },
    [updateLedger]
  );

  useEffect(() => {
    if (!userId || !cloudReady || loadedUserRef.current !== userId ||
      baseUpdatedAtRef.current !== null || pendingRef.current ||
      localStorage.getItem(PENDING_LEDGER_KEY) !== null || !isPristineLedger(ledger)) {
      setLegacyRecovery(null);
      return;
    }
    const legacy = loadLocalLedger();
    setLegacyRecovery(isPristineLedger(legacy) ? null : {
      userId, accounts: legacy.accounts.length, transactions: legacy.transactions.length, jars: legacy.jars.length,
    });
  }, [cloudReady, ledger, userId]);

  const claimLegacyLocalLedger = useCallback(() => {
    if (!userId || !cloudReady || loadedUserRef.current !== userId ||
      baseUpdatedAtRef.current !== null || pendingRef.current ||
      localStorage.getItem(PENDING_LEDGER_KEY) !== null ||
      !isPristineLedger(latestLedgerRef.current))
      throw new Error("Sổ hiện tại đã có dữ liệu hoặc chưa tải xong cloud; không thể nhập sổ cũ tự động.");
    const legacy = loadLocalLedger();
    if (isPristineLedger(legacy)) throw new Error("Không có sổ cũ cần khôi phục.");
    if (!safeSetStorageJson(`${RECOVERY_LEDGER_KEY}:${userId}:before-legacy-claim`, latestLedgerRef.current))
      throw new Error("Chưa lưu được bản sao trước khi khôi phục.");
    updateLedger(() => legacy, true);
  }, [cloudReady, updateLedger, userId]);

  return {
    accounts: ledgerOwner === (userId ?? null) ? ledger.accounts : [],
    archiveAccount,
    cloudStatus,
    claimLegacyLocalLedger,
    deleteTransaction,
    dispatchCategory,
    dispatchExternal,
    dispatchDebt,
    debts: ledgerOwner === (userId ?? null) ? ledger.debts ?? [] : [],
    dispatchJar,
    jars: ledgerOwner === (userId ?? null) ? ledger.jars : [],
    jarActivities: ledgerOwner === (userId ?? null) ? ledger.jarActivities : [],
    categories: ledgerOwner === (userId ?? null) ? ledger.categories ?? [] : [],
    legacyLocalRecoveryCandidate: legacyRecovery?.userId === userId ? legacyRecovery : null,
    replaceLedger,
    retrySync,
    useCloudVersion,
    saveAccount,
    saveTransaction,
    transactions: ledgerOwner === (userId ?? null) ? ledger.transactions : [],
  };
}
