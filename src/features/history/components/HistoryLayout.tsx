import { BookOpenText, ClipboardCheck, ReceiptText } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { GoalScreen, Page } from "../../../types";

type HistoryLayoutProps = {
  children: ReactNode;
  currentPage: "balanceChecks" | "expenses" | "history";
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

const tabs = [
  { icon: BookOpenText, label: "Nhật ký", page: "history" as const },
  { icon: ReceiptText, label: "Chi tiêu", page: "expenses" as const },
  { icon: ClipboardCheck, label: "Kiểm kê số dư", page: "balanceChecks" as const },
];

export function HistoryLayout({ children, currentPage, navigateTo }: HistoryLayoutProps) {
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeTabRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
  }, [currentPage]);

  return (
    <section className="history-layout">
      <header className="history-layout__header">
        <h1>Lịch sử</h1>
        <p>Xem lại các hoạt động tài chính và dữ liệu đã ghi.</p>
      </header>

      <nav className="history-navigation" aria-label="Loại lịch sử">
        <div className="history-navigation__track">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentPage === tab.page;

            return (
              <button
                key={tab.page}
                ref={active ? activeTabRef : undefined}
                type="button"
                className={active ? "is-active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => navigateTo(tab.page)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="history-layout__content">{children}</div>
    </section>
  );
}
