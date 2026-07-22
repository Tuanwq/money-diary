import { BookOpenText, Check, ReceiptText } from "lucide-react";
import type { DetailedJournalTab } from "./types";

type DetailedJournalTabsProps = {
  activeTab: DetailedJournalTab;
  expenseHasData: boolean;
  journalHasData: boolean;
  onChange: (tab: DetailedJournalTab) => void;
};

export function DetailedJournalTabs({
  activeTab,
  expenseHasData,
  journalHasData,
  onChange,
}: DetailedJournalTabsProps) {
  return (
    <nav className="detailed-journal-tabs" aria-label="Nội dung ghi nhật ký chi tiết">
      <button
        type="button"
        className={activeTab === "expense" ? "is-active" : ""}
        aria-current={activeTab === "expense" ? "page" : undefined}
        aria-controls="detailed-expense-panel"
        onClick={() => onChange("expense")}
      >
        <ReceiptText size={17} aria-hidden="true" />
        <span>Chi tiêu</span>
        {expenseHasData && <small><Check size={12} aria-hidden="true" />Đã nhập</small>}
      </button>
      <button
        type="button"
        className={activeTab === "journal" ? "is-active" : ""}
        aria-current={activeTab === "journal" ? "page" : undefined}
        aria-controls="detailed-journal-panel"
        onClick={() => onChange("journal")}
      >
        <BookOpenText size={17} aria-hidden="true" />
        <span>Nhật ký</span>
        {journalHasData && <small><Check size={12} aria-hidden="true" />Đã nhập</small>}
      </button>
    </nav>
  );
}
