import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import type { ThemeMode } from "../../../../hooks/useThemeMode";
import type { GoalScreen, Page } from "../../../../types";
import { AddDataSheet } from "./AddDataSheet";
import { MoneyDesktopSidebar } from "./MoneyDesktopSidebar";
import { MoneyMobileAppBar } from "./MoneyMobileAppBar";
import { MoneyMobileNavigation } from "./MoneyMobileNavigation";
import { MoneyMoreSheet } from "./MoneyMoreSheet";

type MoneyPageShellProps = {
  children: ReactNode;
  currentPage: Page;
  email?: string;
  isCloudRefreshing: boolean;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
  onExportReport: () => void;
  onLogout: () => void;
  onOpenCloseDay: () => void;
  onOpenExpense: () => void;
  onOpenIncome: () => void;
  onOpenBalanceCheck: () => void;
  onOpenAnalytics: () => void;
  onOpenAccountLedger: () => void;
  onOpenAccountReconciliation: () => void;
  onOpenChangeLog: () => void;
  onRetrySync: () => void;
  onSwitchApp: () => void;
  syncStatus: string;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

export function MoneyPageShell({
  children,
  currentPage,
  email,
  isCloudRefreshing,
  navigateTo,
  onExportReport,
  onLogout,
  onOpenCloseDay,
  onOpenExpense,
  onOpenIncome,
  onOpenBalanceCheck,
  onOpenAnalytics,
  onOpenAccountLedger,
  onOpenAccountReconciliation,
  onOpenChangeLog,
  onRetrySync,
  onSwitchApp,
  syncStatus,
  themeMode,
  toggleThemeMode,
}: MoneyPageShellProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [addReturnTarget, setAddReturnTarget] = useState<"desktop" | "mobile">("mobile");
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [moreReturnTarget, setMoreReturnTarget] = useState<
    "desktopAccount" | "mobileAccount" | "navigation"
  >("navigation");
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopAddButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopAccountButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileAccountButtonRef = useRef<HTMLButtonElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const moreReturnFocusRef =
    moreReturnTarget === "desktopAccount"
      ? desktopAccountButtonRef
      : moreReturnTarget === "mobileAccount"
        ? mobileAccountButtonRef
        : moreButtonRef;
  const addReturnFocusRef =
    addReturnTarget === "desktop" ? desktopAddButtonRef : addButtonRef;

  function handleSwipeStart(event: TouchEvent<HTMLElement>) {
    if (currentPage !== "home" && currentPage !== "photoJournal") return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [data-horizontal-gesture]")) {
      swipeStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    swipeStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleSwipeEnd(event: TouchEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    if (currentPage === "home" && deltaX < 0) navigateTo("photoJournal");
    if (currentPage === "photoJournal" && deltaX > 0) navigateTo("home");
  }

  return (
    <div className="money-shell">
      <div className="money-app-layout">
        <MoneyDesktopSidebar
          accountButtonRef={desktopAccountButtonRef}
          addButtonRef={desktopAddButtonRef}
          currentPage={currentPage}
          email={email}
          isCloudRefreshing={isCloudRefreshing}
          navigateTo={navigateTo}
          onLogout={onLogout}
          onOpenAccount={() => {
            setMoreReturnTarget("desktopAccount");
            setIsMoreSheetOpen(true);
          }}
          onOpenAdd={() => {
            setAddReturnTarget("desktop");
            setIsAddSheetOpen(true);
          }}
          onOpenSettings={() => {
            navigateTo("settings");
          }}
          onRetrySync={onRetrySync}
          onSwitchApp={onSwitchApp}
          settingsButtonRef={desktopSettingsButtonRef}
          syncStatus={syncStatus}
        />

        <div className="money-workspace">
          <MoneyMobileAppBar
            accountButtonRef={mobileAccountButtonRef}
            isCloudRefreshing={isCloudRefreshing}
            onOpenAccount={() => {
              setMoreReturnTarget("mobileAccount");
              setIsMoreSheetOpen(true);
            }}
            onRetrySync={onRetrySync}
            syncStatus={syncStatus}
          />

          <main
            className={`money-main-content ${
              currentPage === "home" || currentPage === "photoJournal"
                ? "money-main-content-swipeable"
                : ""
            }`}
            onTouchCancel={() => {
              swipeStartRef.current = null;
            }}
            onTouchEnd={handleSwipeEnd}
            onTouchStart={handleSwipeStart}
          >
            {children}
          </main>
        </div>
      </div>

      <MoneyMobileNavigation
        addButtonRef={addButtonRef}
        currentPage={currentPage}
        moreButtonRef={moreButtonRef}
        navigateTo={navigateTo}
        onOpenAdd={() => {
          setAddReturnTarget("mobile");
          setIsAddSheetOpen(true);
        }}
        onOpenMore={() => {
          setMoreReturnTarget("navigation");
          setIsMoreSheetOpen(true);
        }}
      />

      <AddDataSheet
        isOpen={isAddSheetOpen}
        onAddExpense={onOpenExpense}
        onAddIncome={onOpenIncome}
        onCheckBalance={onOpenBalanceCheck}
        onClose={() => setIsAddSheetOpen(false)}
        returnFocusRef={addReturnFocusRef}
      />

      <MoneyMoreSheet
        email={email}
        isOpen={isMoreSheetOpen}
        mode={
          moreReturnTarget === "navigation" ? "more" : "account"
        }
        onClose={() => setIsMoreSheetOpen(false)}
        onExportReport={onExportReport}
        onLogout={onLogout}
        onOpenAnalytics={onOpenAnalytics}
        onOpenAccountLedger={onOpenAccountLedger}
        onOpenAccountReconciliation={onOpenAccountReconciliation}
        onOpenBalanceChecks={() => navigateTo("balanceChecks")}
        onOpenChangeLog={onOpenChangeLog}
        onOpenCloseDay={onOpenCloseDay}
        onOpenNotificationSettings={() => navigateTo("settings")}
        onSwitchApp={onSwitchApp}
        returnFocusRef={moreReturnFocusRef}
        themeMode={themeMode}
        toggleThemeMode={toggleThemeMode}
      />

    </div>
  );
}
