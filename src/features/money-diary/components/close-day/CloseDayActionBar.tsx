import { Save } from "lucide-react";

type CloseDayActionBarProps = {
  canSubmit: boolean;
  onCancel?: () => void;
};

export function CloseDayActionBar({
  canSubmit,
  onCancel,
}: CloseDayActionBarProps) {
  return (
    <div
      className={`close-day-action-bar${onCancel ? " has-cancel" : ""}`}
    >
      {onCancel && (
        <button
          type="button"
          className="close-day-action-bar__cancel"
          onClick={onCancel}
        >
          Hủy
        </button>
      )}
      <button
        type="submit"
        className="close-day-action-bar__submit"
        disabled={!canSubmit}
      >
        <Save aria-hidden="true" size={18} />
        Lưu chốt ngày
      </button>
    </div>
  );
}
