import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  ACCOUNT_RECONCILIATION_STORAGE_KEY,
  createDefaultReconciliationData,
  isAccountReconciliationData,
  type AccountReconciliation,
  type AccountReconciliationData,
} from "./accountReconciliationModel";

function loadLocalState() {
  try {
    const saved = localStorage.getItem(ACCOUNT_RECONCILIATION_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : null;

    return isAccountReconciliationData(parsed)
      ? parsed
      : createDefaultReconciliationData();
  } catch {
    return createDefaultReconciliationData();
  }
}

export function useAccountReconciliations(userId?: string) {
  const [state, setState] = useState<AccountReconciliationData>(loadLocalState);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const dirtyRef = useRef(false);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
    localStorage.setItem(
      ACCOUNT_RECONCILIATION_STORAGE_KEY,
      JSON.stringify(state)
    );
  }, [state]);

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
      setCloudStatus("Đang tải dữ liệu kiểm kê...");

      const { data, error } = await supabase
        .from("money_diary_account_reconciliation_states")
        .select("checks, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setCloudStatus("Chưa thể đồng bộ kiểm kê tài khoản");
        return;
      }

      const cloudState: AccountReconciliationData | null = data
        ? {
            checks: (data.checks ?? []) as unknown as AccountReconciliation[],
            updatedAt: data.updated_at,
          }
        : null;
      const localState = latestStateRef.current;
      const shouldUseCloud =
        cloudState &&
        new Date(cloudState.updatedAt).getTime() >
          new Date(localState.updatedAt).getTime();
      const nextState = shouldUseCloud ? cloudState : localState;

      if (shouldUseCloud) setState(cloudState);

      const { error: upsertError } = await supabase
        .from("money_diary_account_reconciliation_states")
        .upsert({
          checks: nextState.checks,
          updated_at: nextState.updatedAt,
          user_id: userId,
        });

      if (!active) return;

      if (upsertError) {
        console.error(upsertError);
        setCloudStatus("Chưa thể đồng bộ kiểm kê tài khoản");
        return;
      }

      dirtyRef.current = false;
      setCloudReady(true);
      setCloudStatus("Kiểm kê tài khoản đã đồng bộ");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !dirtyRef.current) return;

    const timeout = window.setTimeout(async () => {
      setCloudStatus("Đang lưu kiểm kê tài khoản...");

      const { error } = await supabase
        .from("money_diary_account_reconciliation_states")
        .upsert({
          checks: state.checks,
          updated_at: state.updatedAt,
          user_id: userId,
        });

      if (error) {
        console.error(error);
        setCloudStatus("Lỗi lưu kiểm kê tài khoản");
        return;
      }

      dirtyRef.current = false;
      setCloudStatus("Kiểm kê tài khoản đã đồng bộ");
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, state, userId]);

  const updateState = useCallback(
    (updater: (current: AccountReconciliation[]) => AccountReconciliation[]) => {
      dirtyRef.current = true;
      setState((current) => ({
        checks: updater(current.checks),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  const saveCheck = useCallback(
    (check: AccountReconciliation) => {
      updateState((checks) =>
        checks.some((item) => item.id === check.id)
          ? checks.map((item) => (item.id === check.id ? check : item))
          : [check, ...checks]
      );
    },
    [updateState]
  );

  const deleteCheck = useCallback(
    (checkId: string) => {
      updateState((checks) => checks.filter((check) => check.id !== checkId));
    },
    [updateState]
  );

  const markLineAdjusted = useCallback(
    ({
      accountId,
      adjustedAt,
      checkId,
      transactionId,
    }: {
      accountId: string;
      adjustedAt: string;
      checkId: string;
      transactionId: string;
    }) => {
      updateState((checks) =>
        checks.map((check) =>
          check.id === checkId
            ? {
                ...check,
                lines: check.lines.map((line) =>
                  line.accountId === accountId
                    ? {
                        ...line,
                        adjustedAt,
                        adjustmentTransactionId: transactionId,
                      }
                    : line
                ),
                updatedAt: adjustedAt,
              }
            : check
        )
      );
    },
    [updateState]
  );

  const replaceReconciliationState = useCallback(
    (checks: AccountReconciliation[]) => {
      updateState(() => checks);
    },
    [updateState]
  );

  return {
    checks: state.checks,
    cloudStatus,
    deleteCheck,
    markLineAdjusted,
    replaceReconciliationState,
    saveCheck,
  };
}
