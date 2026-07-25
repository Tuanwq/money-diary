import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
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

    return isAccountLedgerData(parsed) ? parsed : createDefaultLedger();
  } catch {
    return createDefaultLedger();
  }
}

export function useAccountLedger(userId?: string) {
  const [ledger, setLedger] = useState<AccountLedgerData>(loadLocalLedger);
  const [cloudStatus, setCloudStatus] = useState("Đang lưu trên thiết bị");
  const [cloudReady, setCloudReady] = useState(false);
  const dirtyRef = useRef(false);
  const latestLedgerRef = useRef(ledger);

  useEffect(() => {
    latestLedgerRef.current = ledger;
    localStorage.setItem(ACCOUNT_LEDGER_STORAGE_KEY, JSON.stringify(ledger));
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

      const { data, error } = await supabase
        .from("money_diary_account_ledgers")
        .select("accounts, transactions, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

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
            updatedAt: data.updated_at,
          }
        : null;
      const localLedger = latestLedgerRef.current;
      const shouldUseCloud =
        cloudLedger &&
        new Date(cloudLedger.updatedAt).getTime() >
          new Date(localLedger.updatedAt).getTime();
      const nextLedger = shouldUseCloud ? cloudLedger : localLedger;

      if (shouldUseCloud) setLedger(cloudLedger);

      const { error: upsertError } = await supabase
        .from("money_diary_account_ledgers")
        .upsert({
          accounts: nextLedger.accounts,
          transactions: nextLedger.transactions,
          updated_at: nextLedger.updatedAt,
          user_id: userId,
        });

      if (!active) return;

      if (upsertError) {
        console.error(upsertError);
        setCloudStatus("Chưa thể đồng bộ sổ tài khoản");
        return;
      }

      dirtyRef.current = false;
      setCloudReady(true);
      setCloudStatus("Sổ tài khoản đã đồng bộ");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !cloudReady || !dirtyRef.current) return;

    const timeout = window.setTimeout(async () => {
      setCloudStatus("Đang lưu sổ tài khoản...");

      const { error } = await supabase
        .from("money_diary_account_ledgers")
        .upsert({
          accounts: ledger.accounts,
          transactions: ledger.transactions,
          updated_at: ledger.updatedAt,
          user_id: userId,
        });

      if (error) {
        console.error(error);
        setCloudStatus("Lỗi lưu sổ tài khoản");
        return;
      }

      dirtyRef.current = false;
      setCloudStatus("Sổ tài khoản đã đồng bộ");
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, ledger, userId]);

  const updateLedger = useCallback(
    (
      updater: (current: AccountLedgerData) => Pick<
        AccountLedgerData,
        "accounts" | "transactions"
      >
    ) => {
      dirtyRef.current = true;
      setLedger((current) => ({
        ...updater(current),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

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
      updateLedger((current) => ({
        accounts: current.accounts,
        transactions: current.transactions.filter(
          (transaction) => transaction.id !== transactionId
        ),
      }));
    },
    [updateLedger]
  );

  const replaceLedger = useCallback(
    (accounts: FinancialAccount[], transactions: AccountTransaction[]) => {
      updateLedger(() => ({ accounts, transactions }));
    },
    [updateLedger]
  );

  return {
    accounts: ledger.accounts,
    archiveAccount,
    cloudStatus,
    deleteTransaction,
    replaceLedger,
    saveAccount,
    saveTransaction,
    transactions: ledger.transactions,
  };
}
