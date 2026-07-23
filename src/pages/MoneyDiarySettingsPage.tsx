import { Settings } from "lucide-react";
import { MoneyNotificationSettingsCard } from "../features/notifications/components/MoneyNotificationSettingsCard";

export function MoneyDiarySettingsPage({ userId }: { userId?: string }) {
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
      <MoneyNotificationSettingsCard userId={userId} />
    </div>
  );
}

