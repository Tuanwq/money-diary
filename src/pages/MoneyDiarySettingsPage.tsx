import { Settings } from "lucide-react";
import { AppUpdateCenter } from "../features/app-update/AppUpdateCenter";
import { BackupCenter } from "../features/backup/BackupCenter";
import type {
  BackupSection,
  BackupSnapshot,
  BackupSourceData,
} from "../features/backup/backupModel";
import { MoneyNotificationSettingsCard } from "../features/notifications/components/MoneyNotificationSettingsCard";
import "./MoneyDiarySettingsPage.css";

export function MoneyDiarySettingsPage({
  backupSource,
  onRestoreBackup,
  legacyMoneyToolsVisible,
  onLegacyMoneyToolsVisibilityChange,
  syncStatus,
  userId,
}: {
  backupSource: BackupSourceData;
  onRestoreBackup: (
    snapshot: BackupSnapshot,
    sections: BackupSection[]
  ) => Promise<void> | void;
  legacyMoneyToolsVisible: boolean;
  onLegacyMoneyToolsVisibilityChange: (visible: boolean) => void;
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
      <section className="money-legacy-tools-setting" aria-labelledby="money-legacy-tools-title">
        <div>
          <h2 id="money-legacy-tools-title">Công cụ ghi chép cũ</h2>
          <p>
            Hiện lại lối tắt thu nhập, chi tiêu, ghi chép và HUB cũ trong Money Diary.
            Tắt công tắc chỉ ẩn các lối tắt trên thiết bị này; dữ liệu và lịch sử không bị xóa.
          </p>
        </div>
        <label className="money-legacy-tools-switch">
          <input
            type="checkbox"
            checked={legacyMoneyToolsVisible}
            onChange={(event) => onLegacyMoneyToolsVisibilityChange(event.target.checked)}
          />
          <span>{legacyMoneyToolsVisible ? "Đang hiện" : "Đang ẩn"}</span>
        </label>
      </section>
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
