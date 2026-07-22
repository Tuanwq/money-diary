import { BriefcaseBusiness } from "lucide-react";
import { HUB_SHIFT_OPTIONS_BY_TYPE } from "../../../../constants/hanoiHub";
import type { HubSettings, HubType } from "../../../../types/hub";
import { formatMoneyInput } from "../../../../utils/money";
import { HubSectionHeading } from "./HubSectionHeading";
import { HubSelector } from "./HubSelector";
import type { HubForm, HubFormSetter } from "./types";

type WorkShiftSectionProps = {
  form: HubForm;
  setForm: HubFormSetter;
  settings: HubSettings;
  remainingSingleOrders: number;
  joinedOrders: number;
};

export function WorkShiftSection({
  form,
  setForm,
  settings,
  remainingSingleOrders,
  joinedOrders,
}: WorkShiftSectionProps) {
  function selectHub(hubType: HubType) {
    setForm((current) => ({
      ...current,
      hubType,
      shiftName: HUB_SHIFT_OPTIONS_BY_TYPE[hubType][0],
    }));
  }

  return (
    <section className="hub-form-section hub-work-shift-section">
      <HubSectionHeading
        icon={BriefcaseBusiness}
        title="Thông tin ca làm"
        description="Chọn Hub, khung giờ và số đơn đã hoàn thành."
      />

      <fieldset className="hub-performance-control">
        <legend>Trạng thái ca</legend>
        <div className="hub-segmented-control">
          <button
            type="button"
            className={form.isWellDone ? "is-active" : ""}
            aria-pressed={form.isWellDone}
            onClick={() => setForm((current) => ({ ...current, isWellDone: true }))}
          >
            Đạt mục tiêu
          </button>
          <button
            type="button"
            className={!form.isWellDone ? "is-active" : ""}
            aria-pressed={!form.isWellDone}
            onClick={() => setForm((current) => ({ ...current, isWellDone: false }))}
          >
            Chưa đạt
          </button>
        </div>
        <p className="hub-field-helper">
          Trạng thái này quyết định các khoản thưởng vượt mốc của ca.
        </p>
      </fieldset>

      <HubSelector value={form.hubType} onChange={selectHub} />

      <div className="hub-form-grid hub-form-grid--two">
        <label className="hub-field">
          <span>Ngày làm việc</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              setForm((current) => ({ ...current, date: event.target.value }))
            }
          />
        </label>
        <label className="hub-field">
          <span>Khung giờ</span>
          <select
            value={form.shiftName}
            onChange={(event) =>
              setForm((current) => ({ ...current, shiftName: event.target.value }))
            }
          >
            {HUB_SHIFT_OPTIONS_BY_TYPE[form.hubType].map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="hub-form-grid hub-form-grid--order">
        <label className="hub-field">
          <span>Tổng số đơn trong ca</span>
          <input
            inputMode="numeric"
            value={form.order}
            placeholder="VD: 25"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                order: formatMoneyInput(event.target.value),
              }))
            }
          />
          <small>
            Còn {remainingSingleOrders} đơn lẻ sau khi chuyển {joinedOrders} đơn sang ghép.
          </small>
        </label>

        <label className="hub-toggle-card">
          <input
            type="checkbox"
            checked={form.isHubShort}
            onChange={(event) =>
              setForm((current) => ({ ...current, isHubShort: event.target.checked }))
            }
          />
          <span className="hub-toggle-card__control" aria-hidden="true" />
          <span>
            <strong>Dùng giá Hub ngắn</strong>
            <small>{new Intl.NumberFormat("vi-VN").format(settings.hubShortPrice)} đ / đơn</small>
          </span>
        </label>
      </div>
    </section>
  );
}
