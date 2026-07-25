import { Settings } from "lucide-react";
import { AppUpdateCenter } from "../features/app-update/AppUpdateCenter";
import { BackupCenter } from "../features/backup/BackupCenter";
import type {
  BackupSection,
  BackupSnapshot,
  BackupSourceData,
} from "../features/backup/backupModel";
import { MoneyNotificationSettingsCard } from "../features/notifications/components/MoneyNotificationSettingsCard";

export function MoneyDiarySettingsPage({
  backupSource,
  onRestoreBackup,
  syncStatus,
  userId,
}: {
  backupSource: BackupSourceData;
  onRestoreBackup: (
    snapshot: BackupSnapshot,
    sections: BackupSection[]
  ) => Promise<void> | void;
  syncStatus: string;
  userId: string;
}) {
  return (
    <div className="money-settings-page">
      <header className="money-settings-page-header">
        <span>
          <Settings aria-hidden="true" size={20} />
        </span>
        <div>
          <p>Cài đặt</p>
          <h1>Money Diary</h1>
          <small>
            Quản lý thông báo tài chính và subscription của từng thiết bị.
          </small>
        </div>
      </header>
      <AppUpdateCenter syncStatus={syncStatus} />
      <BackupCenter
        onRestore={onRestoreBackup}
        source={backupSource}
        syncStatus={syncStatus}
        userId={userId}
      />
      <MoneyNotificationSettingsCard userId={userId} />
    </div>
  );
}
