import { Save } from "lucide-react";

type SaveShiftActionBarProps = {
  isEditing: boolean;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel?: () => void;
};

export function SaveShiftActionBar({
  isEditing,
  isSaving,
  canSave,
  onSave,
  onCancel,
}: SaveShiftActionBarProps) {
  return (
    <div className={`hub-save-action${isEditing ? " has-cancel" : ""}`}>
      {isEditing && onCancel && (
        <button type="button" className="hub-save-action__cancel" onClick={onCancel}>
          Hủy
        </button>
      )}
      <button
        type="button"
        className="hub-save-action__submit"
        disabled={!canSave || isSaving}
        onClick={onSave}
      >
        <Save size={18} aria-hidden="true" />
        {isSaving
          ? "Đang lưu..."
          : isEditing
            ? "Cập nhật ca"
            : "Lưu ca và nhật ký"}
      </button>
    </div>
  );
}
