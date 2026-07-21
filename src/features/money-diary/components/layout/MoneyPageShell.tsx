import { useCallback, useRef, useState, type ReactNode } from "react";
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
    "account" | "desktop" | "navigation"
  >("navigation");
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopAddButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreReturnFocusRef =
    moreReturnTarget === "account"
      ? accountButtonRef
      : moreReturnTarget === "navigation"
        ? moreButtonRef
        : desktopSettingsButtonRef;
  const addReturnFocusRef =
    addReturnTarget === "desktop" ? desktopAddButtonRef : addButtonRef;

  const openAnalysis = useCallback(() => {
    navigateTo("home");
    window.setTimeout(() => {
      window.dispatchEvent(new Event("money-diary:open-ai"));
    }, 0);
  }, [navigateTo]);

  return (
    <div className="money-shell">
      <div className="money-app-layout">
        <MoneyDesktopSidebar
          addButtonRef={desktopAddButtonRef}
          currentPage={currentPage}
          email={email}
          isCloudRefreshing={isCloudRefreshing}
          navigateTo={navigateTo}
          onExportReport={onExportReport}
          onLogout={onLogout}
          onOpenAdd={() => {
            setAddReturnTarget("desktop");
            setIsAddSheetOpen(true);
          }}
          onOpenSettings={() => {
            setMoreReturnTarget("desktop");
            setIsMoreSheetOpen(true);
          }}
          onRetrySync={onRetrySync}
          onSwitchApp={onSwitchApp}
          settingsButtonRef={desktopSettingsButtonRef}
          syncStatus={syncStatus}
        />

        <div className="money-workspace">
          <MoneyMobileAppBar
            accountButtonRef={accountButtonRef}
            isCloudRefreshing={isCloudRefreshing}
            onOpenAccount={() => {
              setMoreReturnTarget("account");
              setIsMoreSheetOpen(true);
            }}
            onRetrySync={onRetrySync}
            syncStatus={syncStatus}
          />

          <main className="money-main-content">{children}</main>
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
        onClose={() => setIsMoreSheetOpen(false)}
        onExportReport={onExportReport}
        onLogout={onLogout}
        onOpenAnalysis={openAnalysis}
        onOpenBalanceChecks={() => navigateTo("balanceChecks")}
        onOpenChangeLog={onOpenChangeLog}
        onOpenCloseDay={onOpenCloseDay}
        onSwitchApp={onSwitchApp}
        returnFocusRef={moreReturnFocusRef}
        themeMode={themeMode}
        toggleThemeMode={toggleThemeMode}
      />

    </div>
  );
}
