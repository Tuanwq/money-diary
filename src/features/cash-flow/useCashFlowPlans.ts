import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  CASH_FLOW_STORAGE_KEY,
  createDefaultCashFlowState,
  isCashFlowState,
  type CashFlowPlan,
  type CashFlowState,
} from "./cashFlowForecastModel";

function loadLocalState() {
  try {
    const saved = localStorage.getItem(CASH_FLOW_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : null;
    return isCashFlowState(parsed) ? parsed : createDefaultCashFlowState();
  } catch {
    return createDefaultCashFlowState();
  }
}

export function useCashFlowPlans(userId?: string) {
  const [state, setState] = useState<CashFlowState>(loadLocalState);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const dirtyRef = useRef(false);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
    localStorage.setItem(CASH_FLOW_STORAGE_KEY, JSON.stringify(state));
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
      setCloudStatus("Đang tải kế hoạch dòng tiền...");

      const { data, error } = await supabase
        .from("money_diary_cash_flow_states")
        .select("plans, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setCloudStatus("Chưa thể đồng bộ dòng tiền");
        return;
      }

      const cloudState: CashFlowState | null = data
        ? {
            plans: (data.plans ?? []) as unknown as CashFlowPlan[],
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
        .from("money_diary_cash_flow_states")
        .upsert({
          plans: nextState.plans,
          updated_at: nextState.updatedAt,
          user_id: userId,
        });

      if (!active) return;

      if (upsertError) {
        console.error(upsertError);
        setCloudStatus("Chưa thể đồng bộ dòng tiền");
        return;
      }

      dirtyRef.current = false;
      setCloudReady(true);
      setCloudStatus("Dòng tiền đã đồng bộ");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !dirtyRef.current) return;

    const timeout = window.setTimeout(async () => {
      setCloudStatus("Đang lưu kế hoạch dòng tiền...");

      const { error } = await supabase
        .from("money_diary_cash_flow_states")
        .upsert({
          plans: state.plans,
          updated_at: state.updatedAt,
          user_id: userId,
        });

      if (error) {
        console.error(error);
        setCloudStatus("Lỗi lưu kế hoạch dòng tiền");
        return;
      }

      dirtyRef.current = false;
      setCloudStatus("Dòng tiền đã đồng bộ");
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, state, userId]);

  const updateState = useCallback(
    (updater: (current: CashFlowState) => CashFlowPlan[]) => {
      dirtyRef.current = true;
      setState((current) => ({
        plans: updater(current),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  const savePlan = useCallback(
    (plan: CashFlowPlan) => {
      updateState((current) =>
        current.plans.some((item) => item.id === plan.id)
          ? current.plans.map((item) => (item.id === plan.id ? plan : item))
          : [plan, ...current.plans]
      );
    },
    [updateState]
  );

  const deletePlan = useCallback(
    (planId: string) => {
      updateState((current) =>
        current.plans.filter((plan) => plan.id !== planId)
      );
    },
    [updateState]
  );

  const togglePlan = useCallback(
    (planId: string) => {
      const now = new Date().toISOString();
      updateState((current) =>
        current.plans.map((plan) =>
          plan.id === planId
            ? { ...plan, enabled: !plan.enabled, updatedAt: now }
            : plan
        )
      );
    },
    [updateState]
  );

  const replaceCashFlowState = useCallback(
    (plans: CashFlowPlan[]) => {
      updateState(() => plans);
    },
    [updateState]
  );

  return {
    cloudStatus,
    deletePlan,
    plans: state.plans,
    replaceCashFlowState,
    savePlan,
    togglePlan,
  };
}
