import { useMemo } from "react";
import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
} from "../../../types";
import type { DataWarning } from "../../../utils/dataWarnings";

export type DataCompletionItemId = "income" | "expense" | "balance";

export type DataCompletionItem = {
  actionLabel: string;
  done: boolean;
  id: DataCompletionItemId;
  label: string;
};

type UseDataCompletionOptions = {
  balanceCheck?: BalanceCheckEntry;
  entry?: DailyEntry;
  expense?: ExpenseEntry;
  selectedDate: string;
  warnings: DataWarning[];
};

function isCoveredByCompletionStatus(
  warning: DataWarning,
  selectedDate: string,
  missingIds: Set<DataCompletionItemId>
) {
  if (warning.actionDate !== selectedDate) return false;

  if (missingIds.has("expense") && warning.id.startsWith("income-no-expense-")) {
    return true;
  }

  if (missingIds.has("income") && warning.id.startsWith("expense-no-entry-")) {
    return true;
  }

  return warning.id.startsWith("large-balance-difference-");
}

export function useDataCompletion({
  balanceCheck,
  entry,
  expense,
  selectedDate,
  warnings,
}: UseDataCompletionOptions) {
  return useMemo(() => {
    const items: DataCompletionItem[] = [
      {
        actionLabel: "Nhập thu nhập",
        done: Boolean(entry),
        id: "income",
        label: "Thu nhập",
      },
      {
        actionLabel: "Thêm chi tiêu",
        done: Boolean(expense),
        id: "expense",
        label: "Chi tiêu",
      },
      {
        actionLabel: "Kiểm kê ngay",
        done: Boolean(balanceCheck),
        id: "balance",
        label: "Kiểm kê",
      },
    ];
    const missingItems = items.filter((item) => !item.done);
    const missingIds = new Set(missingItems.map((item) => item.id));
    const detailWarnings = warnings.filter(
      (warning) =>
        !isCoveredByCompletionStatus(warning, selectedDate, missingIds)
    );

    return {
      detailWarnings,
      doneCount: items.length - missingItems.length,
      isComplete: missingItems.length === 0,
      items,
      missingItems,
      primaryMissingItem: missingItems[0],
    };
  }, [balanceCheck, entry, expense, selectedDate, warnings]);
}
