import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

type TaskActionMenuProps = {
  onDelete: () => void;
  onEdit: () => void;
  onMoveTomorrow: () => void;
};

export function TaskActionMenu({
  onDelete,
  onEdit,
  onMoveTomorrow,
}: TaskActionMenuProps) {
  const [open, setOpen] = useState(false);

  function runAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Mở menu nhiệm vụ"
        onClick={() => setOpen((value) => !value)}
        className="daymark-icon-button"
      >
        <MoreHorizontal aria-hidden="true" size={20} />
      </button>

      {open && (
        <div className="daymark-popover daymark-action-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onEdit)}
            className="daymark-menu-item"
          >
            Sửa
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onMoveTomorrow)}
            className="daymark-menu-item"
          >
            Chuyển sang ngày mai
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onDelete)}
            className="daymark-menu-item text-red-600"
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}
