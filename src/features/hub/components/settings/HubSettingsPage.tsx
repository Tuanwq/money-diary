import {
  BookOpenText,
  Calculator,
  Cloud,
  Clock3,
  MapPin,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { HUB_SHIFT_OPTIONS_BY_TYPE, HUB_TYPE_LABEL, HUB_TYPES } from "../../../../constants/hanoiHub";
import type { HubSettings } from "../../../../types/hub";
import { formatMoneyInput, parseMoneyInput } from "../../../../utils/money";
import { HubTabHeader } from "../shared";

type HubSettingsPageProps = {
  settings: HubSettings;
  cloudStatus: string;
  onChange: (settings: HubSettings) => void;
};

function SettingMoneyField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="hub-setting-field">
      <span>{label}</span>
      <small>{description}</small>
      <span className="hub-money-input">
        <input
          inputMode="numeric"
          value={formatMoneyInput(String(value))}
          onChange={(event) => onChange(parseMoneyInput(event.target.value))}
        />
        <span>đ</span>
      </span>
    </label>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="hub-setting-toggle">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="hub-setting-toggle__control" aria-hidden="true" />
    </label>
  );
}

export function HubSettingsPage({ settings, cloudStatus, onChange }: HubSettingsPageProps) {
  return (
    <section className="hub-feature-page hub-settings-page">
      <HubTabHeader
        icon={Settings}
        title="Cài đặt Hub"
        description="Điều chỉnh giá đơn và các quy tắc thưởng đang dùng trong công thức thu nhập."
        action={<span className="hub-auto-save-status"><Cloud size={16} aria-hidden="true" />Tự động lưu</span>}
      />

      <div className="hub-settings-layout">
        <nav className="hub-settings-index" aria-label="Nhóm cài đặt Hub">
          <a href="#hub-settings-shifts"><Clock3 size={16} />Hub và ca làm</a>
          <a href="#hub-settings-income"><Calculator size={16} />Quy tắc thu nhập</a>
          <a href="#hub-settings-journal"><BookOpenText size={16} />Nhật ký</a>
          <a href="#hub-settings-data"><Cloud size={16} />Dữ liệu</a>
        </nav>

        <div className="hub-settings-content">
          <section className="hub-feature-section hub-settings-section" id="hub-settings-shifts">
            <div className="hub-feature-section__heading">
              <MapPin size={19} aria-hidden="true" />
              <div><h3>Hub và ca làm</h3><p>Khu vực hiện tại là Hà Nội; các khung giờ cố định được giữ nguyên.</p></div>
            </div>
            <div className="hub-settings-hubs">
              {HUB_TYPES.map((hubType) => (
                <div key={hubType}>
                  <strong>{HUB_TYPE_LABEL[hubType]}</strong>
                  <span>{HUB_SHIFT_OPTIONS_BY_TYPE[hubType].length} khung giờ</span>
                </div>
              ))}
            </div>
            <SettingMoneyField
              label="Giá Hub ngắn"
              description="Áp dụng khi ca được đánh dấu dùng giá Hub ngắn."
              value={settings.hubShortPrice}
              onChange={(hubShortPrice) => onChange({ ...settings, hubShortPrice })}
            />
          </section>

          <section className="hub-feature-section hub-settings-section" id="hub-settings-income">
            <div className="hub-feature-section__heading">
              <SlidersHorizontal size={19} aria-hidden="true" />
              <div><h3>Quy tắc tính thu nhập</h3><p>Thay đổi tại đây ảnh hưởng tới tạm tính ca và báo cáo Hub.</p></div>
            </div>
            <div className="hub-settings-money-grid">
              <SettingMoneyField
                label="Giá đơn thường"
                description="Giá cơ bản cho mỗi đơn lẻ còn lại."
                value={settings.orderPrice}
                onChange={(orderPrice) => onChange({ ...settings, orderPrice })}
              />
              <SettingMoneyField label="Giá ghép 2" description="Giá cho mỗi lượt ghép 2." value={settings.join2Price} onChange={(join2Price) => onChange({ ...settings, join2Price })} />
              <SettingMoneyField label="Giá ghép 3" description="Giá cho mỗi lượt ghép 3." value={settings.join3Price} onChange={(join3Price) => onChange({ ...settings, join3Price })} />
              <SettingMoneyField label="Giá ghép 4" description="Giá cho mỗi lượt ghép 4." value={settings.join4Price} onChange={(join4Price) => onChange({ ...settings, join4Price })} />
              <SettingMoneyField label="Giá ghép 5" description="Giá cho mỗi lượt ghép 5." value={settings.join5Price} onChange={(join5Price) => onChange({ ...settings, join5Price })} />
            </div>
            <div className="hub-settings-toggles">
              <SettingToggle
                label="Thưởng vượt mốc"
                description="Tính thưởng tổng đơn và đơn ghép theo bảng mốc Hà Nội."
                checked={settings.includeExtraOrderReward}
                onChange={(includeExtraOrderReward) => onChange({ ...settings, includeExtraOrderReward })}
              />
              <SettingToggle
                label="Thưởng theo ngày và khu vực"
                description="Tính thưởng Chủ nhật hoặc thưởng khu vực ngày thường."
                checked={settings.includeSundayReward}
                onChange={(includeSundayReward) => onChange({ ...settings, includeSundayReward })}
              />
            </div>
          </section>

          <section className="hub-feature-section hub-settings-section" id="hub-settings-journal">
            <div className="hub-feature-section__heading">
              <BookOpenText size={19} aria-hidden="true" />
              <div><h3>Nhật ký</h3><p>Dữ liệu ca mới có thể ghi tiền thực nhận, tiền thưởng, tâm trạng và ghi chú vào nhật ký chung.</p></div>
            </div>
            <p className="hub-settings-information">Các trường nhật ký đều không bắt buộc. Khi cập nhật một ca cũ, ứng dụng chỉ cập nhật phần ghi chú của ca và giữ nguyên lịch sử nhật ký đã ghi.</p>
          </section>

          <section className="hub-feature-section hub-settings-section" id="hub-settings-data">
            <div className="hub-feature-section__heading">
              <Cloud size={19} aria-hidden="true" />
              <div><h3>Dữ liệu Hub</h3><p>Trạng thái lưu và đồng bộ hiện tại của module Hub.</p></div>
            </div>
            <div className="hub-settings-data-status"><Cloud size={18} aria-hidden="true" /><span><strong>{cloudStatus}</strong><small>Dữ liệu cục bộ vẫn được giữ khi cloud tạm thời không khả dụng.</small></span></div>
          </section>
        </div>
      </div>
    </section>
  );
}
