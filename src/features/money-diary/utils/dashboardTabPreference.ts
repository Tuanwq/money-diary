export type DashboardTab = "overview" | "allocation";
export const DASHBOARD_TAB_STORAGE_KEY = "money-diary-financial-dashboard-tab";

export function readDashboardTab(storage?: Pick<Storage, "getItem">): DashboardTab {
  try {
    const source = storage ?? localStorage;
    return source.getItem(DASHBOARD_TAB_STORAGE_KEY) === "allocation" ? "allocation" : "overview";
  } catch {
    return "overview";
  }
}

export function rememberDashboardTab(tab: DashboardTab) {
  try {
    localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, tab);
  } catch {
    // The current tab still works for this session if storage is unavailable.
  }
}
