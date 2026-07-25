import { createContext } from "react";
import type {
  AppUpdateDiagnostics,
  AppUpdateStatus,
} from "./appUpdateModel";

export type AppUpdateContextValue = {
  applyUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  currentBuild: AppBuildInfo;
  diagnostics: AppUpdateDiagnostics | null;
  dismissNotice: () => void;
  error: string;
  isNoticeDismissed: boolean;
  refreshDiagnostics: () => Promise<void>;
  remoteBuild: AppBuildInfo | null;
  status: AppUpdateStatus;
};

export const AppUpdateContext =
  createContext<AppUpdateContextValue | null>(null);
