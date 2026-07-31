import type { Session } from "@supabase/supabase-js";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  STORAGE_BALANCE_CHECKS_KEY,
  STORAGE_COMPLETED_GOALS_KEY,
  STORAGE_ENTRIES_KEY,
  STORAGE_EXPENSES_KEY,
  STORAGE_GOALS_KEY,
  defaultGoals,
} from "../constants";
import {
  isMoneyCloudSyncEnabled,
  LOCAL_ONLY_SYNC_STATUS,
} from "../config/moneyCloudSync";
import {
  areMoneySyncSnapshotsEqual,
  mergeMoneySyncSnapshots,
  type MoneySyncSnapshot,
} from "../features/offline-sync/offlineSyncModel";
import {
  enqueueOfflineSyncOperation,
  getOfflineSyncOperationCount,
  getOfflineSyncOperations,
  loadOfflineSyncBase,
  removeOfflineSyncOperation,
  saveOfflineSyncBase,
  updateOfflineSyncOperation,
  type OfflineSyncOperation,
} from "../features/offline-sync/offlineSyncQueue";
import { captureAppError } from "../features/error-monitoring/appErrorMonitor";
import { supabase, supabaseEnvError } from "../lib/supabase";
import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../types";
import { getCloudRenderState } from "./cloudSyncState";

type UseCloudSyncParams = {
  entries: DailyEntry[];
  setEntries: Dispatch<SetStateAction<DailyEntry[]>>;
  expenses: ExpenseEntry[];
  setExpenses: Dispatch<SetStateAction<ExpenseEntry[]>>;
  balanceChecks: BalanceCheckEntry[];
  setBalanceChecks: Dispatch<SetStateAction<BalanceCheckEntry[]>>;
  goals: Goals;
  setGoals: Dispatch<SetStateAction<Goals>>;
  completedGoals: CompletedGoal[];
  setCompletedGoals: Dispatch<SetStateAction<CompletedGoal[]>>;
};

type CloudLoadMode = "initial" | "background";

type RemoteSyncState = {
  revision: number;
  snapshot: MoneySyncSnapshot;
};

type SyncOperationResult = RemoteSyncState & {
  status: "applied" | "conflict" | "duplicate";
};

function createEmptySnapshot(): MoneySyncSnapshot {
  return {
    balanceChecks: [],
    completedGoals: [],
    entries: [],
    expenses: [],
    goals: { ...defaultGoals, subGoals: [] },
  };
}

function createSnapshot(input: {
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
}): MoneySyncSnapshot {
  return {
    balanceChecks: input.balanceChecks,
    completedGoals: input.completedGoals,
    entries: input.entries,
    expenses: input.expenses,
    goals: input.goals,
  };
}

function parseRemoteSnapshot(data: Record<string, unknown> | null) {
  const empty = createEmptySnapshot();

  return {
    balanceChecks: Array.isArray(data?.balance_checks)
      ? (data.balance_checks as BalanceCheckEntry[])
      : empty.balanceChecks,
    completedGoals: Array.isArray(data?.completed_goals)
      ? (data.completed_goals as CompletedGoal[])
      : empty.completedGoals,
    entries: Array.isArray(data?.entries)
      ? (data.entries as DailyEntry[])
      : empty.entries,
    expenses: Array.isArray(data?.expenses)
      ? (data.expenses as ExpenseEntry[])
      : empty.expenses,
    goals:
      data?.goals && typeof data.goals === "object"
        ? ({ ...defaultGoals, ...(data.goals as Partial<Goals>) } as Goals)
        : empty.goals,
  } satisfies MoneySyncSnapshot;
}

function isMissingSafeSyncFeature(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.code === "42703" ||
    error.message?.includes("sync_revision") ||
    error.message?.includes("sync_money_diary_state")
  );
}

async function loadRemoteSyncState(userId: string): Promise<RemoteSyncState> {
  const safeQuery = await supabase
    .from("money_diary_state")
    .select(
      "entries, goals, completed_goals, expenses, balance_checks, sync_revision"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!safeQuery.error) {
    return {
      revision: Number(safeQuery.data?.sync_revision ?? 0),
      snapshot: parseRemoteSnapshot(
        safeQuery.data as Record<string, unknown> | null
      ),
    };
  }

  if (!isMissingSafeSyncFeature(safeQuery.error)) throw safeQuery.error;

  // Giữ ứng dụng chạy được trong khoảng thời gian migration chưa được deploy.
  const legacyQuery = await supabase
    .from("money_diary_state")
    .select("entries, goals, completed_goals, expenses, balance_checks")
    .eq("user_id", userId)
    .maybeSingle();

  if (legacyQuery.error) throw legacyQuery.error;

  return {
    revision: 0,
    snapshot: parseRemoteSnapshot(
      legacyQuery.data as Record<string, unknown> | null
    ),
  };
}

function parseSyncOperationResult(data: unknown): SyncOperationResult {
  const row = (data ?? {}) as Record<string, unknown>;
  const status = row.status;

  if (
    status !== "applied" &&
    status !== "conflict" &&
    status !== "duplicate"
  ) {
    throw new Error("Phản hồi đồng bộ không hợp lệ.");
  }

  return {
    revision: Number(row.revision ?? 0),
    snapshot: parseRemoteSnapshot(row),
    status,
  };
}

async function applySyncOperation(
  operation: OfflineSyncOperation,
  expectedRevision: number
): Promise<SyncOperationResult> {
  const { data, error } = await supabase.rpc("sync_money_diary_state", {
    p_balance_checks: operation.snapshot.balanceChecks,
    p_completed_goals: operation.snapshot.completedGoals,
    p_entries: operation.snapshot.entries,
    p_expected_revision: expectedRevision,
    p_expenses: operation.snapshot.expenses,
    p_goals: operation.snapshot.goals,
    p_operation_id: operation.id,
  });

  if (!error) return parseSyncOperationResult(data);
  if (!isMissingSafeSyncFeature(error)) throw error;

  const { error: legacyError } = await supabase
    .from("money_diary_state")
    .upsert({
      balance_checks: operation.snapshot.balanceChecks,
      completed_goals: operation.snapshot.completedGoals,
      entries: operation.snapshot.entries,
      expenses: operation.snapshot.expenses,
      goals: operation.snapshot.goals,
      updated_at: new Date().toISOString(),
      user_id: operation.userId,
    });

  if (legacyError) throw legacyError;

  return {
    revision: expectedRevision + 1,
    snapshot: operation.snapshot,
    status: "applied",
  };
}

function getPendingStatus(userId: string) {
  const count = getOfflineSyncOperationCount(userId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return count > 0
      ? `Ngoại tuyến · ${count} thay đổi đang chờ`
      : "Ngoại tuyến";
  }

  return count > 0 ? `Chờ đồng bộ · ${count} thay đổi` : "Đã đồng bộ";
}

export function useCloudSync({
  entries,
  setEntries,
  expenses,
  setExpenses,
  balanceChecks,
  setBalanceChecks,
  goals,
  setGoals,
  completedGoals,
  setCompletedGoals,
}: UseCloudSyncParams) {
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [cloudLoaded, setCloudLoaded] = useState(!isMoneyCloudSyncEnabled);
  const [isCloudRefreshing, setIsCloudRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(
    !isMoneyCloudSyncEnabled
      ? LOCAL_ONLY_SYNC_STATUS
      : supabaseEnvError
        ? "Thiếu cấu hình Supabase"
        : "Chưa đồng bộ"
  );
  const [hadLocalDataAtMount] = useState(() => {
    if (
      entries.length > 0 ||
      expenses.length > 0 ||
      balanceChecks.length > 0 ||
      completedGoals.length > 0
    ) {
      return true;
    }

    return [
      STORAGE_ENTRIES_KEY,
      STORAGE_EXPENSES_KEY,
      STORAGE_BALANCE_CHECKS_KEY,
      STORAGE_GOALS_KEY,
      STORAGE_COMPLETED_GOALS_KEY,
    ].some((key) => localStorage.getItem(key) !== null);
  });
  const localDirtyRef = useRef(false);
  const cloudLoadedRef = useRef(!isMoneyCloudSyncEnabled);
  const cloudRequestRef = useRef<Promise<void> | null>(null);
  const flushRequestRef = useRef<Promise<void> | null>(null);
  const syncRevisionRef = useRef(0);
  const lastSyncedSnapshotRef = useRef<MoneySyncSnapshot | null>(null);
  const userId = session?.user?.id;
  const activeUserIdRef = useRef(userId);
  const latestDataRef = useRef({
    entries,
    expenses,
    balanceChecks,
    goals,
    completedGoals,
  });

  useEffect(() => {
    latestDataRef.current = {
      entries,
      expenses,
      balanceChecks,
      goals,
      completedGoals,
    };
  }, [entries, expenses, balanceChecks, goals, completedGoals]);

  useEffect(() => {
    activeUserIdRef.current = userId;
    cloudRequestRef.current = null;
    flushRequestRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (supabaseEnvError) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const applySnapshotToState = useCallback(
    (snapshot: MoneySyncSnapshot) => {
      latestDataRef.current = snapshot;
      setEntries(snapshot.entries);
      setExpenses(snapshot.expenses);
      setBalanceChecks(snapshot.balanceChecks);
      setGoals(snapshot.goals);
      setCompletedGoals(snapshot.completedGoals);
    },
    [setBalanceChecks, setCompletedGoals, setEntries, setExpenses, setGoals]
  );

  const flushOfflineQueue = useCallback(
    (targetUserId: string) => {
      if (!isMoneyCloudSyncEnabled) return Promise.resolve();
      if (flushRequestRef.current) return flushRequestRef.current;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus(getPendingStatus(targetUserId));
        return Promise.resolve();
      }

      const request = (async () => {
        let conflictCount = 0;
        let lastRemoteSnapshot: MoneySyncSnapshot | null = null;
        let lastAppliedSnapshot: MoneySyncSnapshot | null = null;
        let currentServerSnapshot =
          loadOfflineSyncBase(targetUserId)?.snapshot ??
          lastSyncedSnapshotRef.current;

        while (activeUserIdRef.current === targetUserId) {
          const operation = getOfflineSyncOperations(targetUserId)[0];
          if (!operation) break;

          const pendingCount = getOfflineSyncOperationCount(targetUserId);
          setSyncStatus(`Đang đồng bộ ${pendingCount} thay đổi...`);
          let currentOperation = operation;
          let completed = false;

          if (
            currentServerSnapshot &&
            currentOperation.baseRevision !== syncRevisionRef.current
          ) {
            const rebased = mergeMoneySyncSnapshots(
              currentOperation.baseSnapshot,
              currentOperation.snapshot,
              currentServerSnapshot
            );
            conflictCount += rebased.conflicts;
            currentOperation = {
              ...currentOperation,
              baseRevision: syncRevisionRef.current,
              baseSnapshot: currentServerSnapshot,
              snapshot: rebased.snapshot,
            };
            updateOfflineSyncOperation(currentOperation);
          }

          for (let attempt = 0; attempt < 3 && !completed; attempt += 1) {
            try {
              currentOperation = {
                ...currentOperation,
                attempts: currentOperation.attempts + 1,
              };
              updateOfflineSyncOperation(currentOperation);
              const result = await applySyncOperation(
                currentOperation,
                syncRevisionRef.current
              );

              if (activeUserIdRef.current !== targetUserId) return;

              syncRevisionRef.current = result.revision;
              lastRemoteSnapshot = result.snapshot;
              currentServerSnapshot = result.snapshot;

              if (result.status === "conflict") {
                const localBeforeMerge = currentOperation.snapshot;
                const merged = mergeMoneySyncSnapshots(
                  currentOperation.baseSnapshot,
                  currentOperation.snapshot,
                  result.snapshot
                );
                conflictCount += Math.max(merged.conflicts, 1);
                currentOperation = {
                  ...currentOperation,
                  baseRevision: result.revision,
                  baseSnapshot: result.snapshot,
                  snapshot: merged.snapshot,
                };
                updateOfflineSyncOperation(currentOperation);

                if (
                  areMoneySyncSnapshotsEqual(
                    createSnapshot(latestDataRef.current),
                    localBeforeMerge
                  )
                ) {
                  applySnapshotToState(merged.snapshot);
                }
                continue;
              }

              removeOfflineSyncOperation(currentOperation.id);
              lastAppliedSnapshot = result.snapshot;
              lastSyncedSnapshotRef.current = result.snapshot;
              saveOfflineSyncBase(
                targetUserId,
                result.revision,
                result.snapshot
              );
              completed = true;
            } catch (error) {
              console.error(error);
              captureAppError({
                category: "sync",
                error,
                message: "Không thể gửi hàng đợi đồng bộ lên cloud",
              });
              localDirtyRef.current = true;
              setSyncStatus(getPendingStatus(targetUserId));
              return;
            }
          }

          if (!completed) {
            setSyncStatus("Có xung đột chưa thể gộp");
            return;
          }
        }

        const remaining = getOfflineSyncOperationCount(targetUserId);
        localDirtyRef.current = remaining > 0;

        if (remaining === 0 && lastRemoteSnapshot) {
          const currentSnapshot = createSnapshot(latestDataRef.current);
          if (
            !lastAppliedSnapshot ||
            areMoneySyncSnapshotsEqual(currentSnapshot, lastAppliedSnapshot)
          ) {
            lastSyncedSnapshotRef.current = lastRemoteSnapshot;
            applySnapshotToState(lastRemoteSnapshot);
          }
        }

        if (conflictCount > 0) {
          console.info(`Đã tự động gộp ${conflictCount} xung đột dữ liệu.`);
        }
        setSyncStatus(getPendingStatus(targetUserId));
      })();

      flushRequestRef.current = request;
      void request.finally(() => {
        if (flushRequestRef.current === request) {
          flushRequestRef.current = null;
        }
      });

      return request;
    },
    [applySnapshotToState]
  );

  const loadCloudData = useCallback(
    (targetUserId: string, mode: CloudLoadMode = "initial") => {
      if (!isMoneyCloudSyncEnabled) {
        cloudLoadedRef.current = true;
        setCloudLoaded(true);
        setSyncStatus(LOCAL_ONLY_SYNC_STATUS);
        return Promise.resolve();
      }

      if (cloudRequestRef.current) return cloudRequestRef.current;

      const isBackground = mode === "background";
      const request = (async () => {
        if (isBackground) {
          setIsCloudRefreshing(true);
          setSyncStatus("Đang đồng bộ...");
        } else {
          setSyncStatus("Đang tải và gộp dữ liệu...");
        }

        try {
          const remote = await loadRemoteSyncState(targetUserId);
          if (activeUserIdRef.current !== targetUserId) return;

          syncRevisionRef.current = remote.revision;
          const pending = getOfflineSyncOperations(targetUserId);

          cloudLoadedRef.current = true;
          setCloudLoaded(true);

          if (pending.length > 0) {
            localDirtyRef.current = true;
            setSyncStatus(getPendingStatus(targetUserId));
            await flushOfflineQueue(targetUserId);
            return;
          }

          const localSnapshot = createSnapshot(latestDataRef.current);
          const savedBase = loadOfflineSyncBase(targetUserId);
          const baseSnapshot = savedBase?.snapshot ?? createEmptySnapshot();
          const merged = mergeMoneySyncSnapshots(
            baseSnapshot,
            localSnapshot,
            remote.snapshot
          );

          lastSyncedSnapshotRef.current = remote.snapshot;
          saveOfflineSyncBase(targetUserId, remote.revision, remote.snapshot);
          applySnapshotToState(merged.snapshot);

          if (!areMoneySyncSnapshotsEqual(merged.snapshot, remote.snapshot)) {
            enqueueOfflineSyncOperation({
              baseRevision: remote.revision,
              baseSnapshot: remote.snapshot,
              snapshot: merged.snapshot,
              userId: targetUserId,
            });
            localDirtyRef.current = true;
            await flushOfflineQueue(targetUserId);
          } else {
            localDirtyRef.current = false;
            if (merged.conflicts > 0) {
              console.info(
                `Đã tự động gộp ${merged.conflicts} xung đột dữ liệu.`
              );
            }
            setSyncStatus("Đã đồng bộ");
          }
        } catch (error) {
          console.error(error);
          captureAppError({
            category: "sync",
            error,
            message: "Không thể tải hoặc gộp dữ liệu cloud",
          });
          setSyncStatus(
            isBackground ? getPendingStatus(targetUserId) : "Lỗi tải dữ liệu cloud"
          );
        } finally {
          if (isBackground) setIsCloudRefreshing(false);
        }
      })();

      cloudRequestRef.current = request;
      void request.finally(() => {
        if (cloudRequestRef.current === request) cloudRequestRef.current = null;
      });

      return request;
    },
    [applySnapshotToState, flushOfflineQueue]
  );

  const retryCloudLoad = useCallback(() => {
    if (!isMoneyCloudSyncEnabled) {
      setSyncStatus(LOCAL_ONLY_SYNC_STATUS);
      return Promise.resolve();
    }
    if (!userId) return Promise.resolve();

    if (getOfflineSyncOperationCount(userId) > 0) {
      return flushOfflineQueue(userId);
    }

    const mode =
      cloudLoadedRef.current || hadLocalDataAtMount ? "background" : "initial";
    return loadCloudData(userId, mode);
  }, [flushOfflineQueue, hadLocalDataAtMount, loadCloudData, userId]);

  useEffect(() => {
    if (!isMoneyCloudSyncEnabled || !userId) return;

    const timeout = window.setTimeout(() => {
      void loadCloudData(userId, hadLocalDataAtMount ? "background" : "initial");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [hadLocalDataAtMount, userId, loadCloudData]);

  useEffect(() => {
    if (!isMoneyCloudSyncEnabled || !userId || !cloudLoaded) return;

    const currentSnapshot = createSnapshot({
      entries,
      expenses,
      balanceChecks,
      goals,
      completedGoals,
    });

    if (
      lastSyncedSnapshotRef.current &&
      areMoneySyncSnapshotsEqual(currentSnapshot, lastSyncedSnapshotRef.current)
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const base = loadOfflineSyncBase(userId) ?? {
        revision: syncRevisionRef.current,
        snapshot: lastSyncedSnapshotRef.current ?? createEmptySnapshot(),
        syncedAt: new Date().toISOString(),
      };

      enqueueOfflineSyncOperation({
        baseRevision: base.revision,
        baseSnapshot: base.snapshot,
        snapshot: currentSnapshot,
        userId,
      });
      localDirtyRef.current = true;
      setSyncStatus(getPendingStatus(userId));
      void flushOfflineQueue(userId);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [
    entries,
    expenses,
    balanceChecks,
    goals,
    completedGoals,
    userId,
    cloudLoaded,
    flushOfflineQueue,
  ]);

  useEffect(() => {
    if (!isMoneyCloudSyncEnabled || !userId) return;

    function handleOnline() {
      setSyncStatus("Đã có mạng, đang đồng bộ...");
      void flushOfflineQueue(userId!);
    }

    function handleOffline() {
      setSyncStatus(getPendingStatus(userId!));
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushOfflineQueue, userId]);

  useEffect(() => {
    if (!isMoneyCloudSyncEnabled || !userId) return;

    let refreshing = false;
    async function refreshWhenBackToApp() {
      if (refreshing) return;

      if (getOfflineSyncOperationCount(userId!) > 0) {
        await flushOfflineQueue(userId!);
        return;
      }

      if (localDirtyRef.current) return;
      refreshing = true;

      try {
        await loadCloudData(
          userId!,
          cloudLoadedRef.current || hadLocalDataAtMount
            ? "background"
            : "initial"
        );
      } finally {
        refreshing = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void refreshWhenBackToApp();
    }

    window.addEventListener("focus", refreshWhenBackToApp);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshWhenBackToApp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushOfflineQueue, hadLocalDataAtMount, loadCloudData, userId]);

  function markLocalChanged(message = "Có thay đổi, đang chờ đồng bộ...") {
    if (!isMoneyCloudSyncEnabled) {
      localDirtyRef.current = false;
      setSyncStatus(LOCAL_ONLY_SYNC_STATUS);
      return;
    }

    localDirtyRef.current = true;
    setSyncStatus(
      typeof navigator !== "undefined" && !navigator.onLine
        ? "Đã lưu trên thiết bị · chờ có mạng"
        : message
    );
  }

  async function handleSignUp() {
    if (supabaseEnvError) {
      alert(supabaseEnvError);
      return;
    }

    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      alert("Bạn chưa nhập email hoặc mật khẩu.");
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Đăng ký thành công. Nếu Supabase yêu cầu xác nhận email, hãy mở email để xác nhận."
    );
  }

  async function handleLogin() {
    if (supabaseEnvError) {
      alert(supabaseEnvError);
      return;
    }

    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      alert("Bạn chưa nhập email hoặc mật khẩu.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function handleLogout() {
    if (supabaseEnvError) return;
    await supabase.auth.signOut();

    cloudLoadedRef.current = !isMoneyCloudSyncEnabled;
    lastSyncedSnapshotRef.current = null;
    syncRevisionRef.current = 0;
    setSession(null);
    setCloudLoaded(!isMoneyCloudSyncEnabled);
    setIsCloudRefreshing(false);
    setSyncStatus(
      isMoneyCloudSyncEnabled ? "Chưa đồng bộ" : LOCAL_ONLY_SYNC_STATUS
    );
  }

  const { cloudLoadError, isCloudLoading } = getCloudRenderState({
    cloudLoaded,
    hadLocalDataAtMount,
    syncStatus,
    userId,
  });

  return {
    session,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    cloudLoadError,
    isCloudLoading,
    isCloudRefreshing,
    retryCloudLoad,
    isMoneyCloudSyncEnabled,
    syncStatus,
    supabaseEnvError,
    setSyncStatus,
    markLocalChanged,
    handleSignUp,
    handleLogin,
    handleLogout,
  };
}
