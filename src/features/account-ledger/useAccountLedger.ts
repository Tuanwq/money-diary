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
  nextLedgerTimestamp, overlayLedgerAdditions } from "./ledgerSync.ts";
import { PENDING_LEDGER_KEY, ledgerKey, pendingKey, selectLocalLedgerValue } from "./ledgerStorageScope.ts";
import { describeLedgerCloudError, isRetryableLedgerNetworkError } from "./ledgerCloudError.ts";
import { applyCategoryCommand, linkTransactionCategory, migrateTransactionCategories, type CategoryCommand } from "./transactionCategories.ts";
import { applyAccountExternalCommand, assertExternalCoverageAfterLedgerChange,
  calculateAccountExternalAmount, type AccountExternalCommand } from "./accountExternalModel.ts";
import { applyDebtCommand, getDebtRemaining, type DebtCommand } from "./debtModel.ts";
import { applySavingsCommand, type SavingsCommand } from "../savings/services/savingsService.ts";
import { assertSavingsCoverageAfterLedgerChange, getSavingsReserved } from "../savings/domain/savingsModel.ts";
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
type PendingLedger = {
  userId: string;
  baseUpdatedAt: string | null;
  additions?: AccountTransaction[];
};

type AddTransactionResult =
  | { status: "applied" | "duplicate"; updated_at: string }
  | { status: "conflict" | "missing" | "id_conflict" };

function assertLedgerCoverage(current: AccountLedgerData, next: AccountLedgerData,
  allowSavingsRecalculation = false) {
  assertExternalCoverageAfterLedgerChange(current, next);
  assertReservationCoverageAfterLedgerChange(current, next);
  if (!allowSavingsRecalculation) assertSavingsCoverageAfterLedgerChange(current, next);
}

function readPendingLedger(userId?: string): PendingLedger | null {
  try {
    const value = JSON.parse(localStorage.getItem(pendingKey(userId)) ??
      (userId ? localStorage.getItem(PENDING_LEDGER_KEY) : null) ?? "null") as PendingLedger | null;
    return value && typeof value.userId === "string" &&
      (!userId || value.userId === userId) &&
      (typeof value.baseUpdatedAt === "string" || value.baseUpdatedAt === null) &&
      (value.additions === undefined || (Array.isArray(value.additions) && value.additions.length > 0))
      ? value : null;
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

    const ledger = isAccountLedgerData(parsed) ? {
      ...parsed, jars: Array.isArray(parsed.jars) ? parsed.jars : [],
      jarActivities: Array.isArray(parsed.jarActivities) ? parsed.jarActivities : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      savingsRules: Array.isArray(parsed.savingsRules) ? parsed.savingsRules : [],
      savingsAllocations: Array.isArray(parsed.savingsAllocations) ? parsed.savingsAllocations : [],
    } : createDefaultLedger();
    return overlayLedgerAdditions(ledger, readPendingLedger(userId)?.additions ?? []);
  } catch {
    return createDefaultLedger();
  }
}

export function useAccountLedger(userId?: string, legacyBudgets: ExpenseBudget[] = EMPTY_LEGACY_BUDGETS,
  photoUploadBusy = false) {
  const [ledger, setLedger] = useState<AccountLedgerData>(() => loadLocalLedger(userId));
  const [ledgerOwner, setLedgerOwner] = useState(userId ?? null);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const [jarSchemaReady, setJarSchemaReady] = useState(true);
  const [categorySchemaReady, setCategorySchemaReady] = useState(true);
  const [debtSchemaReady, setDebtSchemaReady] = useState(true);
  const [savingsSchemaReady, setSavingsSchemaReady] = useState(true);
  const [legacyRecovery, setLegacyRecovery] = useState<{
    userId: string; accounts: number; transactions: number; jars: number;
  } | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);
  const dirtyRef = useRef(false);
  const pendingRef = useRef<PendingLedger | null>(null);
  const baseUpdatedAtRef = useRef<string | null>(null);
  const remoteLedgerRef = useRef<AccountLedgerData | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const latestLedgerRef = useRef(ledger);
  const uncertainSaveRef = useRef<AccountLedgerData | null>(null);
  const ownerRef = useRef(userId ?? null);
  const cloudChainRef = useRef<Promise<void>>(Promise.resolve());
  const photoUploadBusyRef = useRef(photoUploadBusy);
  useEffect(() => { photoUploadBusyRef.current = photoUploadBusy; }, [photoUploadBusy]);

  useEffect(() => {
    const pending = readPendingLedger(userId);
    pendingRef.current = pending;
    dirtyRef.current = Boolean(pending);
    if (ownerRef.current === (userId ?? null)) return;
    const next = loadLocalLedger(userId);
    ownerRef.current = userId ?? null;
    latestLedgerRef.current = next;
    uncertainSaveRef.current = null;
    baseUpdatedAtRef.current = null;
    remoteLedgerRef.current = null;
    loadedUserRef.current = null;
    setCloudReady(false);
    setLedgerOwner(userId ?? null);
    setLedger(next);
  }, [userId]);

  useEffect(() => {
    if (ledgerOwner !== (userId ?? null)) return;
    if (latestLedgerRef.current === ledger) safeSetStorageJson(ledgerKey(userId), ledger);
  }, [ledger, ledgerOwner, userId]);

  useEffect(() => {
    if (!userId) {
      const timeout = window.setTimeout(() => {
        loadedUserRef.current = null;
        baseUpdatedAtRef.current = null;
        remoteLedgerRef.current = null;
        setCloudReady(false);
        setCloudStatus("Đang lưu trên thiết bị");
      }, 0);

      return () => window.clearTimeout(timeout);
    }
    // Large ledger reads compete with the camera upload on mobile networks.
    // Resume the normal revision check as soon as the photo finishes.
    if (photoUploadBusy) return;

    let active = true;
    const refreshCloudLedger = async () => {
      if (!active || ownerRef.current !== userId) return;
      const signal = AbortSignal.timeout(20_000);
      // Foreground checks only fetch the revision first. On iOS/4G the JSONB
      // ledger can be large, but most checks find no remote change.
      const cachedRevision = remoteLedgerRef.current?.updatedAt;
      if (loadedUserRef.current === userId && cachedRevision &&
        (!dirtyRef.current || pendingRef.current?.additions)) {
        const revisionResult = await supabase.from("money_diary_account_ledgers")
          .select("updated_at").eq("user_id", userId).abortSignal(signal).maybeSingle();
        if (!active) return;
        if (revisionResult.error) {
          console.error(revisionResult.error);
          const record = captureAppError({ category: "sync", message: "Không thể kiểm tra sổ tài khoản trên cloud",
            detail: `${revisionResult.error.code}: ${revisionResult.error.message}` });
          setCloudStatus(`Chưa thể đồng bộ sổ tài khoản · ${describeLedgerCloudError({ ...revisionResult.error, status: revisionResult.status })} · ${record.code}`);
          return;
        }
        if (revisionResult.data?.updated_at === cachedRevision) {
          setCloudReady(true);
          setCloudStatus(pendingRef.current ? "Đang đồng bộ giao dịch..." : "Sổ tài khoản đã đồng bộ");
          return;
        }
      }
      setCloudStatus("Đang tải sổ tài khoản...");

      let { data, error, status } = await supabase
        .from("money_diary_account_ledgers")
        .select("accounts, transactions, jars, jar_activities, categories, debts, savings_rules, savings_allocations, updated_at")
        .eq("user_id", userId)
        .abortSignal(signal)
        .maybeSingle();

      if (!active) return;

      let schemaAvailable = true;
      let savingsSchemaAvailable = true;
      if (error && /savings_rules|savings_allocations/i.test(error.message)) {
        savingsSchemaAvailable = false;
        const fallback = await supabase.from("money_diary_account_ledgers")
          .select("accounts, transactions, jars, jar_activities, categories, debts, updated_at")
          .eq("user_id", userId).abortSignal(signal).maybeSingle();
        if (!active) return;
        data = fallback.data as typeof data;
        error = fallback.error;
        status = fallback.status;
        setSavingsSchemaReady(false);
      } else setSavingsSchemaReady(true);
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
          .eq("user_id", userId).abortSignal(signal).maybeSingle();
        if (!active) return;
        data = fallback.data as typeof data;
        error = fallback.error;
        status = fallback.status;
        schemaAvailable = false;
        setJarSchemaReady(false);
      } else {
        setJarSchemaReady(true);
      }

      if (error) {
        console.error(error);
        const record = captureAppError({ category: "sync", message: "Không thể tải sổ tài khoản từ cloud",
          detail: `${error.code}: ${error.message}` });
        setCloudStatus(`Chưa thể đồng bộ sổ tài khoản · ${describeLedgerCloudError({ ...error, status })} · ${record.code}`);
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
            savingsRules: (data.savings_rules ?? []) as AccountLedgerData["savingsRules"],
            savingsAllocations: (data.savings_allocations ?? []) as AccountLedgerData["savingsAllocations"],
            updatedAt: data.updated_at,
          }
        : null;
      if (!schemaAvailable) {
        setCloudReady(false);
        setCloudStatus("Hũ đang lưu trên thiết bị · cần áp dụng migration Supabase");
        return;
      }
      const localLedger = latestLedgerRef.current;
      if (!savingsSchemaAvailable && (localLedger.savingsRules?.length || localLedger.savingsAllocations?.length)) {
        setCloudReady(false);
        setCloudStatus("Tiết kiệm chưa đồng bộ · cần áp dụng migration Supabase trước khi tải bản cloud");
        return;
      }
      const pending = pendingRef.current?.userId === userId ? pendingRef.current : null;
      baseUpdatedAtRef.current = cloudLedger?.updatedAt ?? null;
      remoteLedgerRef.current = cloudLedger;
      loadedUserRef.current = userId;
      if (pending?.additions && cloudLedger) {
        const next = overlayLedgerAdditions(cloudLedger, pending.additions);
        // Keep the queued IDs until the server confirms each receipt. A newer
        // snapshot can safely replace the cached base for append-only edits.
        pendingRef.current = { ...pending, baseUpdatedAt: cloudLedger.updatedAt };
        latestLedgerRef.current = next;
        setLedger(next);
        setCloudReady(true);
        setCloudStatus("Đang đồng bộ giao dịch...");
        return;
      }
      if (pending?.additions && pending.baseUpdatedAt === null) {
        // The first upload initializes the ledger and its account metadata.
        const firstUpload = { userId, baseUpdatedAt: null };
        if (!safeSetStorageJson(ledgerKey(userId), localLedger) ||
          !safeSetStorageJson(pendingKey(userId), firstUpload)) {
          setCloudStatus("Chưa thể lưu trạng thái đồng bộ trên thiết bị");
          return;
        }
        pendingRef.current = firstUpload;
      }
      const decision = decideLedgerLoad(localLedger, cloudLedger, pending?.baseUpdatedAt);
      if (decision === "conflict") {
        // Safari can report "Load failed" after the server committed a write.
        // If the cloud contains that attempted snapshot, advance the pending
        // base instead of treating newer local edits as a remote conflict.
        if (cloudLedger && uncertainSaveRef.current &&
          areLedgerContentsEqual(uncertainSaveRef.current, cloudLedger)) {
          uncertainSaveRef.current = null;
          baseUpdatedAtRef.current = cloudLedger.updatedAt;
          if (!areLedgerContentsEqual(localLedger, cloudLedger)) {
            const nextPending = { userId, baseUpdatedAt: cloudLedger.updatedAt };
            if (!safeSetStorageJson(pendingKey(userId), nextPending)) {
              setCloudStatus("Chưa thể lưu trạng thái đồng bộ trên thiết bị");
              return;
            }
            pendingRef.current = nextPending;
            dirtyRef.current = true;
            setCloudReady(true);
            setCloudStatus("Đang lưu sổ tài khoản...");
            return;
          }
        }
        if (cloudLedger && areLedgerContentsEqual(localLedger, cloudLedger)) {
          if (!safeSetStorageJson(ledgerKey(userId), cloudLedger)) {
            setCloudStatus("Chưa thể lưu bản cloud trên thiết bị · hãy kiểm tra dung lượng");
            return;
          }
          clearPendingLedger(userId);
          pendingRef.current = null;
          dirtyRef.current = false;
          uncertainSaveRef.current = null;
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
    };
    const timeout = window.setTimeout(() => {
      cloudChainRef.current = cloudChainRef.current.catch(() => undefined).then(refreshCloudLedger);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId, retryIndex, photoUploadBusy]);

  const retrySync = useCallback(() => {
    setCloudReady(false);
    setRetryIndex((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (!photoUploadBusy && document.visibilityState === "visible" &&
        ((cloudReady && !dirtyRef.current) || /chưa thể|lỗi|ngoại tuyến/i.test(cloudStatus))) retrySync();
    };
    const resumeOnline = () => { if (!photoUploadBusy) retrySync(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", resumeOnline);
    const interval = window.setInterval(refresh, 15_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", resumeOnline);
      window.clearInterval(interval);
    };
  }, [cloudReady, cloudStatus, userId, retrySync, photoUploadBusy]);

  const useCloudVersion = useCallback(() => {
    if (!userId) return;
    if (!safeSetStorageJson(`${RECOVERY_LEDGER_KEY}:${userId}`, latestLedgerRef.current))
      throw new Error("Chưa lưu được bản sao trên thiết bị.");
    clearPendingLedger(userId);
    pendingRef.current = null;
    dirtyRef.current = false;
    loadedUserRef.current = null;
    remoteLedgerRef.current = null;
    retrySync();
  }, [retrySync, userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !jarSchemaReady || !categorySchemaReady || !debtSchemaReady ||
      !dirtyRef.current || photoUploadBusy) return;

    let active = true;
    const timeout = window.setTimeout(() => {
      // Serialize writes and compare the remote revision. A stale device must
      // never bring back a jar removed by another device.
      cloudChainRef.current = cloudChainRef.current.catch(() => undefined).then(async () => {
        const pending = pendingRef.current;
        if (!active || photoUploadBusyRef.current || !dirtyRef.current || loadedUserRef.current !== userId ||
          pending?.userId !== userId) return;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setCloudStatus("Ngoại tuyến · sổ đang chờ đồng bộ");
          return;
        }

        const additions = pending.additions;
        if (additions) {
          const remote = remoteLedgerRef.current;
          if (!remote || additions.length === 0) return;
          const transaction = additions[0];
          const nextRemote = overlayLedgerAdditions(remote, [transaction]);
          const revision = baseUpdatedAtRef.current;
          // Revalidate after a concurrent write. Already applied IDs are sent
          // through the same RPC so the server can verify the receipt.
          let validationError: string | null = null;
          if (nextRemote !== remote) {
            try {
              const hasActiveAccount = (id: string | undefined) =>
                remote.accounts.some((account) => account.id === id && !account.archivedAt);
              if (!hasActiveAccount(transaction.accountId) ||
                (transaction.type === "transfer" && !hasActiveAccount(transaction.toAccountId)))
                throw new Error("Tài khoản của giao dịch đã bị ẩn hoặc không còn trên cloud.");
              assertLedgerCoverage(remote, nextRemote);
            } catch (error) {
              validationError = error instanceof Error ? error.message : "Hãy kiểm tra lại giao dịch.";
            }
          }
          setCloudStatus("Đang đồng bộ giao dịch...");
          const startedAt = performance.now();
          const signal = AbortSignal.timeout(20_000);
          const { data, error, status } = await supabase.rpc("add_ledger_transaction", {
            p_user_id: userId,
            // A null revision permits a receipt check but cannot add a row.
            p_expected_updated_at: validationError ? null : revision,
            p_transaction: transaction,
          }).abortSignal(signal);
          if (ownerRef.current !== userId || loadedUserRef.current !== userId) return;
          if (error) {
            if (isRetryableLedgerNetworkError({ ...error, status })) uncertainSaveRef.current = nextRemote;
            const record = captureAppError({
              category: "sync",
              message: "Không thể đồng bộ giao dịch lên cloud",
              detail: `${error.code}: ${error.message} · HTTP ${status} · timeout: ${signal.aborted} · ${Math.round(performance.now() - startedAt)} ms`,
            });
            setCloudStatus(`Chưa thể đồng bộ giao dịch · ${describeLedgerCloudError({ ...error, status })} · ${record.code}`);
            return;
          }
          const result = data as AddTransactionResult | null;
          if (result?.status === "conflict" && validationError) {
            setCloudStatus(`Xung đột đồng bộ giao dịch · ${validationError}`);
            return;
          }
          if (result?.status === "conflict" || (result?.status === "duplicate" && result.updated_at !== revision)) {
            // Fetch the actual ledger before accepting the newer revision.
            retrySync();
            return;
          }
          if (result?.status === "missing" || result?.status === "id_conflict") {
            setCloudStatus("Xung đột đồng bộ giao dịch · mở Tài khoản để kiểm tra sổ trên cloud");
            return;
          }
          if ((result?.status !== "applied" && result?.status !== "duplicate") ||
            typeof result.updated_at !== "string") {
            setCloudStatus("Chưa thể xác nhận giao dịch trên cloud");
            return;
          }
          const currentPending = pendingRef.current;
          if (currentPending?.userId !== userId) return;
          const savedRemote = {
            ...(result.status === "duplicate" ? remote : nextRemote),
            updatedAt: result.updated_at,
          };
          if (!currentPending.additions) {
            if (result.status === "duplicate" && nextRemote !== remote) {
              setCloudReady(false);
              setCloudStatus("Xung đột đồng bộ giao dịch · giao dịch đã thay đổi trên cloud");
              return;
            }
            // A full edit arrived during this RPC. The append was guarded by
            // the same base revision, so the full edit can continue from it.
            const nextPending = { userId, baseUpdatedAt: savedRemote.updatedAt };
            if (!safeSetStorageJson(pendingKey(userId), nextPending)) {
              setCloudStatus("Chưa thể lưu trạng thái đồng bộ trên thiết bị");
              return;
            }
            pendingRef.current = nextPending;
            baseUpdatedAtRef.current = savedRemote.updatedAt;
            remoteLedgerRef.current = savedRemote;
            uncertainSaveRef.current = null;
            return;
          }
          const remaining = currentPending.additions.filter((item) => item.id !== transaction.id);
          const next = overlayLedgerAdditions(savedRemote, remaining);
          const nextPending = remaining.length > 0
            ? { userId, baseUpdatedAt: savedRemote.updatedAt, additions: remaining } : null;
          if (!safeSetStorageJson(ledgerKey(userId), next) ||
            (nextPending && !safeSetStorageJson(pendingKey(userId), nextPending))) {
            setCloudStatus("Chưa thể lưu trạng thái đồng bộ trên thiết bị");
            return;
          }
          if (!nextPending) clearPendingLedger(userId);
          pendingRef.current = nextPending;
          dirtyRef.current = Boolean(nextPending);
          uncertainSaveRef.current = null;
          baseUpdatedAtRef.current = savedRemote.updatedAt;
          remoteLedgerRef.current = savedRemote;
          latestLedgerRef.current = next;
          setLedger(next);
          setCloudStatus(nextPending ? "Đang đồng bộ giao dịch..." : "Sổ tài khoản đã đồng bộ");
          return;
        }

        const current = latestLedgerRef.current;
        const expected = pending.baseUpdatedAt;
        if (expected !== baseUpdatedAtRef.current) {
          retrySync();
          return;
        }
        setCloudStatus("Đang lưu sổ tài khoản...");
        const payload = {
          accounts: current.accounts,
          transactions: current.transactions,
          jars: current.jars,
          jar_activities: current.jarActivities,
          categories: current.categories ?? [],
          debts: current.debts ?? [],
          ...(savingsSchemaReady ? { savings_rules: current.savingsRules ?? [],
            savings_allocations: current.savingsAllocations ?? [] } : {}),
          updated_at: expected === null ? current.updatedAt : nextLedgerTimestamp(expected, Date.parse(current.updatedAt)),
        };
        const saveOnce = () => {
          const signal = AbortSignal.timeout(20_000);
          return expected === null
            ? supabase.from("money_diary_account_ledgers")
                .insert({ ...payload, user_id: userId }).select("updated_at")
                .abortSignal(signal).maybeSingle()
            : supabase.from("money_diary_account_ledgers")
                .update(payload).eq("user_id", userId).eq("updated_at", expected)
                .select("updated_at").abortSignal(signal).maybeSingle();
        };
        let { data, error, status } = await saveOnce();
        if (error && isRetryableLedgerNetworkError({ ...error, status }) && loadedUserRef.current === userId &&
          typeof navigator !== "undefined" && navigator.onLine) {
          // A lost response does not prove the write failed. The revision guard
          // makes a second attempt safe; a committed first write returns no row
          // and is reconciled against the cloud below.
          setCloudStatus("Kết nối gián đoạn · đang thử lưu sổ lại...");
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          if (loadedUserRef.current !== userId) return;
          ({ data, error, status } = await saveOnce());
        }
        if (loadedUserRef.current !== userId) return;
        if (error) {
          uncertainSaveRef.current = current;
          if (expected === null && error.code === "23505") {
            setCloudStatus("Đang kiểm tra sổ vừa lưu trên cloud...");
            retrySync();
            return;
          }
          console.error(error);
          const record = captureAppError({ category: "sync", message: "Không thể lưu sổ tài khoản lên cloud",
            detail: `${error.code}: ${error.message}` });
          setCloudStatus(error.code === "23505"
            ? "Xung đột đồng bộ sổ tài khoản · bản cloud đã thay đổi"
            : `Lỗi lưu sổ tài khoản · ${describeLedgerCloudError({ ...error, status })} · ${record.code}`);
          return;
        }
        if (!data) {
          uncertainSaveRef.current = current;
          setCloudReady(false);
          setCloudStatus("Đang kiểm tra bản cloud sau khi lưu sổ...");
          retrySync();
          return;
        }
        baseUpdatedAtRef.current = data.updated_at;
        remoteLedgerRef.current = { ...current, updatedAt: data.updated_at };
        uncertainSaveRef.current = null;
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

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [cloudReady, jarSchemaReady, categorySchemaReady, debtSchemaReady, savingsSchemaReady,
    ledger, userId, photoUploadBusy, retrySync]);

  const updateLedger = useCallback(
    (
      updater: (current: AccountLedgerData) => Pick<
        AccountLedgerData,
        "accounts" | "transactions"
      >,
      allowExternalShortfall = false,
      allowSavingsRecalculation = false,
      addition?: AccountTransaction
    ) => {
      const current = latestLedgerRef.current;
      if (ownerRef.current !== (userId ?? null))
        throw new Error("Đang chuyển tài khoản. Hãy thử lại sau khi sổ được tải.");
      const next = { ...current, ...updater(current), updatedAt: nextLedgerTimestamp(current.updatedAt) };
      if (!allowExternalShortfall) assertLedgerCoverage(current, next, allowSavingsRecalculation);
      // The append queue contains enough data to recover after a reload.
      // Keep an existing queue until its replacement snapshot is durable.
      let pending: PendingLedger | null = null;
      if (userId) {
        const previous = pendingRef.current;
        const needsInitialUpload = loadedUserRef.current === userId && !remoteLedgerRef.current;
        const baseUpdatedAt = previous ? previous.baseUpdatedAt : baseUpdatedAtRef.current;
        if (addition && (previous?.additions || (!previous && !needsInitialUpload))) {
          pending = { userId, baseUpdatedAt,
            additions: [...(previous?.additions ?? []), addition] };
        } else {
          pending = { userId, baseUpdatedAt };
          if (previous?.additions && remoteLedgerRef.current && !allowExternalShortfall)
            assertLedgerCoverage(remoteLedgerRef.current, next, allowSavingsRecalculation);
        }
        if ((pending.additions || !previous?.additions) && !safeSetStorageJson(pendingKey(userId), pending))
          throw new Error("Thiết bị chưa lưu được trạng thái đồng bộ.");
      }
      // Additions can be recovered from the queue if the snapshot cache fails.
      if (!pending?.additions && !safeSetStorageJson(ledgerKey(userId), next)) {
        throw new Error("Thiết bị chưa lưu được sổ tài khoản. Hãy giải phóng bộ nhớ hoặc bật đồng bộ trước khi thử lại.");
      }
      if (pending && !pending.additions && pendingRef.current?.additions &&
        !safeSetStorageJson(pendingKey(pending.userId), pending))
        throw new Error("Thiết bị chưa lưu được trạng thái đồng bộ.");
      if (pending) pendingRef.current = pending;
      dirtyRef.current = true;
      latestLedgerRef.current = next;
      setLedger(next);
      setCloudStatus(pending?.additions ? "Đang đồng bộ giao dịch..."
        : userId ? "Đang lưu sổ tài khoản..." : "Đang lưu trên thiết bị");
    },
    [userId]
  );

  const ledgerSynced = cloudStatus === "Sổ tài khoản đã đồng bộ";
  useEffect(() => {
    if (userId && (!cloudReady || pendingRef.current?.additions)) return;
    const now = new Date().toISOString();
    const current = latestLedgerRef.current;
    const repaired = repairClosedJars(current, now);
    const next = migrateExpenseBudgets(repaired, legacyBudgets, now);
    const withCategories = migrateTransactionCategories(next === current ? current : { ...current, ...next });
    if (withCategories !== current) updateLedger(() => withCategories);
  }, [cloudReady, ledgerSynced, legacyBudgets, updateLedger, userId]);

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

  const dispatchSavings = useCallback((command: SavingsCommand) => {
    if (command.type === "refresh" && pendingRef.current?.additions) return;
    if (userId && (!cloudReady || !savingsSchemaReady || loadedUserRef.current !== userId))
      throw new Error("Tiết kiệm chưa sẵn sàng đồng bộ. Hãy áp dụng migration Supabase hoặc thử lại.");
    const current = latestLedgerRef.current;
    const next = applySavingsCommand(current, command);
    if (next !== current) updateLedger(() => next);
  }, [cloudReady, savingsSchemaReady, updateLedger, userId]);

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
      if (getSavingsReserved(latestLedgerRef.current, accountId) > 0)
        throw new Error("Tài khoản còn tiền dành riêng cho tiết kiệm. Hãy giải phóng trước khi ẩn.");
      if (latestLedgerRef.current.savingsRules?.some((rule) => !rule.deletedAt && !rule.paused &&
        (rule.sourceAccountId === accountId ||
          (rule.destination.kind === "transfer" && rule.destination.accountId === accountId))))
        throw new Error("Tài khoản đang được dùng bởi quy tắc tiết kiệm. Hãy tạm dừng hoặc sửa quy tắc trước khi ẩn.");
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
      const current = latestLedgerRef.current;
      const old = current.transactions.find((item) => item.id === transaction.id);
      if (old?.jarActivityId)
        throw new Error("Giao dịch từ hũ cần được sửa trong chi tiết hũ để giữ đúng nguồn tiền.");
      if (transaction.type === "debt" || old?.debtId)
        throw new Error("Giao dịch công nợ cần được sửa trong chi tiết khoản nợ.");
      if (current.savingsAllocations?.some((item) => item.transactionId === transaction.id))
        throw new Error("Giao dịch tiết kiệm cần được điều chỉnh trong trang Tiết kiệm.");
      const recalculatesSavings = Boolean(old && (old.type === "income" || old.isWorkExpense ||
        transaction.type === "income" || transaction.isWorkExpense) &&
        current.savingsAllocations?.some((item) => item.date === old.date &&
          item.sourceAccountId === old.accountId && item.status !== "skipped"));
      const linked = linkTransactionCategory(transaction, current.categories ?? []);
      updateLedger(() => ({
        accounts: current.accounts,
        transactions: old
          ? current.transactions.map((item) => item.id === linked.id ? linked : item)
          : [linked, ...current.transactions],
      }), false, recalculatesSavings, old ? undefined : linked);
    },
    [updateLedger]
  );

  const deleteTransaction = useCallback(
    (transactionId: string) => {
      const old = latestLedgerRef.current.transactions.find((item) => item.id === transactionId);
      const affected = old?.jarActivityId
        ? latestLedgerRef.current.transactions.filter((item) => item.jarActivityId === old.jarActivityId)
        : old ? [old] : [];
      const recalculatesSavings = affected.some((transaction) =>
        (transaction.type === "income" || transaction.isWorkExpense) &&
        latestLedgerRef.current.savingsAllocations?.some((item) => item.date === transaction.date &&
          item.sourceAccountId === transaction.accountId && item.status !== "skipped"));
      updateLedger((current) => {
        const target = current.transactions.find((item) => item.id === transactionId);
        if (target?.debtId) throw new Error("Hãy hoàn tác giao dịch trong chi tiết khoản công nợ.");
        if (current.savingsAllocations?.some((item) => item.transactionId === transactionId))
          throw new Error("Hãy điều chỉnh khoản chuyển trong trang Tiết kiệm.");
        const groupId = target?.jarActivityId;
        return {
          accounts: current.accounts,
          transactions: current.transactions.filter((item) => groupId
            ? item.jarActivityId !== groupId : item.id !== transactionId),
          jarActivities: groupId
            ? current.jarActivities.filter((item) => item.id !== groupId)
            : current.jarActivities,
        };
      }, false, recalculatesSavings);
    },
    [updateLedger]
  );

  const replaceLedger = useCallback(
    (accounts: FinancialAccount[], transactions: AccountTransaction[],
      jars: AccountLedgerData["jars"] = [], jarActivities: AccountLedgerData["jarActivities"] = [],
      categories?: AccountLedgerData["categories"], debts: AccountLedgerData["debts"] = [],
      savingsRules: AccountLedgerData["savingsRules"] = [], savingsAllocations: AccountLedgerData["savingsAllocations"] = []) => {
      updateLedger(() => ({ accounts, transactions, jars, jarActivities, categories, debts,
        savingsRules, savingsAllocations }), true);
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
    dispatchSavings,
    savingsSchemaReady: !userId || savingsSchemaReady,
    savingsRules: ledgerOwner === (userId ?? null) ? ledger.savingsRules ?? [] : [],
    savingsAllocations: ledgerOwner === (userId ?? null) ? ledger.savingsAllocations ?? [] : [],
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
