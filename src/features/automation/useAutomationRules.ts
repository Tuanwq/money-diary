import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { safeSetStorageJson } from "../../utils/safeStorage";
import {
  AUTOMATION_STORAGE_KEY,
  createDefaultAutomationState,
  executionToLog,
  isAutomationState,
  type AutomationExecution,
  type AutomationRule,
  type AutomationState,
} from "./automationModel";

function loadLocalState() {
  try {
    const saved = localStorage.getItem(AUTOMATION_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : null;

    return isAutomationState(parsed) ? parsed : createDefaultAutomationState();
  } catch {
    return createDefaultAutomationState();
  }
}

export function useAutomationRules(userId?: string) {
  const [state, setState] = useState<AutomationState>(loadLocalState);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const dirtyRef = useRef(false);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
    safeSetStorageJson(AUTOMATION_STORAGE_KEY, state);
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
      setCloudStatus("Đang tải quy tắc...");

      const { data, error } = await supabase
        .from("money_diary_automation_states")
        .select("rules, logs, processed_keys, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setCloudStatus("Chưa thể đồng bộ quy tắc");
        return;
      }

      const cloudState: AutomationState | null = data
        ? {
            logs: (data.logs ?? []) as unknown as AutomationState["logs"],
            processedKeys: (data.processed_keys ??
              []) as unknown as string[],
            rules: (data.rules ?? []) as unknown as AutomationRule[],
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
        .from("money_diary_automation_states")
        .upsert({
          logs: nextState.logs.slice(0, 300),
          processed_keys: nextState.processedKeys.slice(0, 3000),
          rules: nextState.rules,
          updated_at: nextState.updatedAt,
          user_id: userId,
        });

      if (!active) return;

      if (upsertError) {
        console.error(upsertError);
        setCloudStatus("Chưa thể đồng bộ quy tắc");
        return;
      }

      dirtyRef.current = false;
      setCloudReady(true);
      setCloudStatus("Quy tắc đã đồng bộ");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !dirtyRef.current) return;

    const timeout = window.setTimeout(async () => {
      setCloudStatus("Đang lưu quy tắc...");

      const { error } = await supabase
        .from("money_diary_automation_states")
        .upsert({
          logs: state.logs.slice(0, 300),
          processed_keys: state.processedKeys.slice(0, 3000),
          rules: state.rules,
          updated_at: state.updatedAt,
          user_id: userId,
        });

      if (error) {
        console.error(error);
        setCloudStatus("Lỗi lưu quy tắc");
        return;
      }

      dirtyRef.current = false;
      setCloudStatus("Quy tắc đã đồng bộ");
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, state, userId]);

  const updateState = useCallback(
    (
      updater: (current: AutomationState) => Pick<
        AutomationState,
        "logs" | "processedKeys" | "rules"
      >
    ) => {
      dirtyRef.current = true;
      setState((current) => ({
        ...updater(current),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  const saveRule = useCallback(
    (rule: AutomationRule) => {
      updateState((current) => ({
        logs: current.logs,
        processedKeys: current.processedKeys,
        rules: current.rules.some((item) => item.id === rule.id)
          ? current.rules.map((item) => (item.id === rule.id ? rule : item))
          : [rule, ...current.rules],
      }));
    },
    [updateState]
  );

  const deleteRule = useCallback(
    (ruleId: string) => {
      updateState((current) => ({
        logs: current.logs,
        processedKeys: current.processedKeys,
        rules: current.rules.filter((rule) => rule.id !== ruleId),
      }));
    },
    [updateState]
  );

  const deleteLog = useCallback(
    (logId: string) => {
      updateState((current) => ({
        logs: current.logs.filter((log) => log.id !== logId),
        processedKeys: current.processedKeys,
        rules: current.rules,
      }));
    },
    [updateState]
  );

  const clearLogs = useCallback(() => {
    updateState((current) => ({
      logs: [],
      processedKeys: current.processedKeys,
      rules: current.rules,
    }));
  }, [updateState]);

  const toggleRule = useCallback(
    (ruleId: string) => {
      const now = new Date().toISOString();

      updateState((current) => ({
        logs: current.logs,
        processedKeys: current.processedKeys,
        rules: current.rules.map((rule) =>
          rule.id === ruleId
            ? {
                ...rule,
                activeFrom: rule.enabled ? rule.activeFrom : now,
                enabled: !rule.enabled,
                updatedAt: now,
              }
            : rule
        ),
      }));
    },
    [updateState]
  );

  const commitExecutions = useCallback(
    (executions: AutomationExecution[]) => {
      if (executions.length === 0) return;

      const now = new Date().toISOString();
      updateState((current) => ({
        logs: [
          ...executions.map((execution) => executionToLog(execution, now)),
          ...current.logs,
        ].slice(0, 300),
        processedKeys: [
          ...executions.map((execution) => execution.idempotencyKey),
          ...current.processedKeys,
        ].slice(0, 3000),
        rules: current.rules,
      }));
    },
    [updateState]
  );

  const replaceAutomationState = useCallback(
    (nextState: Pick<AutomationState, "logs" | "processedKeys" | "rules">) => {
      updateState(() => nextState);
    },
    [updateState]
  );

  return {
    clearLogs,
    cloudStatus,
    commitExecutions,
    deleteLog,
    deleteRule,
    logs: state.logs,
    processedKeys: state.processedKeys,
    replaceAutomationState,
    rules: state.rules,
    saveRule,
    toggleRule,
  };
}
