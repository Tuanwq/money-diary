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
import { supabase, supabaseEnvError } from "../lib/supabase";
import { getCloudRenderState } from "./cloudSyncState";
import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../types";
import { mergeByNewestDate } from "../utils/sync";

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
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [isCloudRefreshing, setIsCloudRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(
    supabaseEnvError ? "Thiếu cấu hình Supabase" : "Chưa đồng bộ"
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
  const cloudLoadedRef = useRef(false);
  const cloudRequestRef = useRef<Promise<void> | null>(null);
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
  }, [userId]);

  useEffect(() => {
    if (supabaseEnvError) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadCloudData = useCallback(
    (userId: string, mode: CloudLoadMode = "initial") => {
      if (cloudRequestRef.current) {
        return cloudRequestRef.current;
      }

      const isBackground = mode === "background";
      const request = (async () => {
        if (isBackground) {
          setIsCloudRefreshing(true);
          setSyncStatus("Đang đồng bộ...");
        } else {
          setSyncStatus("Đang tải và gộp dữ liệu...");
        }

        try {
          const { data, error } = await supabase
            .from("money_diary_state")
            .select("entries, goals, completed_goals, expenses, balance_checks")
            .eq("user_id", userId)
            .maybeSingle();

          if (activeUserIdRef.current !== userId) return;

          if (error) {
            console.error(error);
            setSyncStatus(
              isBackground ? "Chưa thể đồng bộ" : "Lỗi tải dữ liệu cloud"
            );
            return;
          }

          const {
            entries: localEntries,
            expenses: localExpenses,
            balanceChecks: localBalanceChecks,
            goals: localGoals,
            completedGoals: localCompletedGoals,
          } = latestDataRef.current;

          const cloudExpenses = data?.expenses
            ? ((data.expenses || []) as unknown as ExpenseEntry[])
            : [];

          const cloudBalanceChecks = data?.balance_checks
            ? ((data.balance_checks || []) as unknown as BalanceCheckEntry[])
            : [];

          const cloudEntries = data?.entries
            ? ((data.entries || []) as unknown as DailyEntry[])
            : [];

          const cloudGoals = data?.goals
            ? ({
                ...defaultGoals,
                ...((data.goals || {}) as unknown as Goals),
              } as Goals)
            : null;

          const cloudCompletedGoals = data?.completed_goals
            ? ((data.completed_goals || []) as unknown as CompletedGoal[])
            : [];

          const mergedExpenses = mergeByNewestDate(cloudExpenses, localExpenses);
          const mergedBalanceChecks = mergeByNewestDate(
            cloudBalanceChecks,
            localBalanceChecks
          );
          const mergedEntries = mergeByNewestDate(cloudEntries, localEntries);

          const mergedCompletedGoalsMap = new Map<string, CompletedGoal>();

          cloudCompletedGoals.forEach((goal) => {
            mergedCompletedGoalsMap.set(goal.id, goal);
          });

          localCompletedGoals.forEach((goal) => {
            mergedCompletedGoalsMap.set(goal.id, goal);
          });

          const mergedCompletedGoals = Array.from(
            mergedCompletedGoalsMap.values()
          );
          const mergedGoals = cloudGoals ?? localGoals;

          setExpenses(mergedExpenses);
          setBalanceChecks(mergedBalanceChecks);
          setEntries(mergedEntries);
          setGoals(mergedGoals);
          setCompletedGoals(mergedCompletedGoals);
          cloudLoadedRef.current = true;
          setCloudLoaded(true);

          const { error: upsertError } = await supabase
            .from("money_diary_state")
            .upsert({
              user_id: userId,
              entries: mergedEntries,
              goals: mergedGoals,
              completed_goals: mergedCompletedGoals,
              expenses: mergedExpenses,
              balance_checks: mergedBalanceChecks,
              updated_at: new Date().toISOString(),
            });

          if (activeUserIdRef.current !== userId) return;

          if (upsertError) {
            console.error(upsertError);
            setSyncStatus("Chưa thể đồng bộ");
            return;
          }

          setSyncStatus("Đã đồng bộ");
        } catch (error) {
          console.error(error);
          setSyncStatus(
            isBackground ? "Chưa thể đồng bộ" : "Lỗi tải dữ liệu cloud"
          );
        } finally {
          if (isBackground) {
            setIsCloudRefreshing(false);
          }
        }
      })();

      cloudRequestRef.current = request;
      void request.finally(() => {
        if (cloudRequestRef.current === request) {
          cloudRequestRef.current = null;
        }
      });

      return request;
    },
    [setBalanceChecks, setCompletedGoals, setEntries, setExpenses, setGoals]
  );

  const retryCloudLoad = useCallback(() => {
    if (!userId) return Promise.resolve();
    const mode = cloudLoadedRef.current || hadLocalDataAtMount
      ? "background"
      : "initial";
    return loadCloudData(userId, mode);
  }, [hadLocalDataAtMount, loadCloudData, userId]);

  useEffect(() => {
    if (!userId) return;

    const timeout = window.setTimeout(() => {
      void loadCloudData(
        userId,
        hadLocalDataAtMount ? "background" : "initial"
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [hadLocalDataAtMount, userId, loadCloudData]);

  useEffect(() => {
    if (!userId || !cloudLoaded) return;

    const timeout = setTimeout(async () => {
      setSyncStatus("Đang lưu...");

      const { error } = await supabase.from("money_diary_state").upsert({
        user_id: userId,
        entries,
        expenses,
        balance_checks: balanceChecks,
        goals,
        completed_goals: completedGoals,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(error);
        setSyncStatus("Lỗi lưu cloud");
        return;
      }

      localDirtyRef.current = false;
      setSyncStatus("Đã đồng bộ");
    }, 700);

    return () => clearTimeout(timeout);
  }, [
    entries,
    expenses,
    balanceChecks,
    goals,
    completedGoals,
    userId,
    cloudLoaded,
  ]);

  useEffect(() => {
    if (!userId) return;

    let refreshing = false;

    async function refreshWhenBackToApp() {
      if (!userId || refreshing) return;

      // Nếu vừa sửa dữ liệu local mà chưa kịp lưu cloud,
      // không kéo cloud cũ về ghi đè.
      if (localDirtyRef.current) return;

      refreshing = true;
      const mode = cloudLoadedRef.current || hadLocalDataAtMount
        ? "background"
        : "initial";

      try {
        await loadCloudData(userId, mode);
      } finally {
        refreshing = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshWhenBackToApp();
      }
    }

    window.addEventListener("focus", refreshWhenBackToApp);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshWhenBackToApp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hadLocalDataAtMount, userId, loadCloudData]);

  function markLocalChanged(message = "Có thay đổi, đang chờ đồng bộ...") {
    localDirtyRef.current = true;
    setSyncStatus(message);
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }
  }

  async function handleLogout() {
    if (supabaseEnvError) return;

    await supabase.auth.signOut();

    cloudLoadedRef.current = false;
    setSession(null);
    setCloudLoaded(false);
    setIsCloudRefreshing(false);
    setSyncStatus("Chưa đồng bộ");
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
    syncStatus,
    supabaseEnvError,
    setSyncStatus,
    markLocalChanged,
    handleSignUp,
    handleLogin,
    handleLogout,
  };
}
