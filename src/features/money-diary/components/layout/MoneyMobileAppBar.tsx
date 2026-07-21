import { CircleUserRound } from "lucide-react";
import type { RefObject } from "react";
import { MoneySyncStatus } from "./MoneySyncStatus";

type MoneyMobileAppBarProps = {
  accountButtonRef: RefObject<HTMLButtonElement | null>;
  isCloudRefreshing: boolean;
  onOpenAccount: () => void;
  onRetrySync: () => void;
  syncStatus: string;
};

export function MoneyMobileAppBar({
  accountButtonRef,
  isCloudRefreshing,
  onOpenAccount,
  onRetrySync,
  syncStatus,
}: MoneyMobileAppBarProps) {
  return (
    <header className="money-mobile-app-bar">
      <button
        type="button"
        className="money-mobile-brand"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Lên đầu trang Money Diary"
      >
        <span className="money-brand-mark" aria-hidden="true">M</span>
        <span>Money Diary</span>
      </button>

      <div className="money-mobile-app-actions">
        <MoneySyncStatus
          isRefreshing={isCloudRefreshing}
          onRetry={onRetrySync}
          syncStatus={syncStatus}
        />
        <button
          ref={accountButtonRef}
          type="button"
          className="money-avatar-button"
          onClick={onOpenAccount}
          aria-label="Mở menu tài khoản"
        >
          <CircleUserRound aria-hidden="true" size={22} />
        </button>
      </div>
    </header>
  );
}
