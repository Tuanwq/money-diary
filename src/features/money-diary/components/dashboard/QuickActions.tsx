import { ClipboardCheck, History, PackagePlus, ReceiptText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type QuickActionsProps = {
  onBalance: () => void;
  onExpense: () => void;
  onHistory: () => void;
  onIncome: () => void;
};

export function QuickActions({
  onBalance,
  onExpense,
  onHistory,
  onIncome,
}: QuickActionsProps) {
  const actions = [
    {
      description: "Ghi khoản vừa kiếm được.",
      icon: PackagePlus,
      label: "Nhập thu nhập",
      onClick: onIncome,
    },
    {
      description: "Cập nhật các khoản đã chi.",
      icon: ReceiptText,
      label: "Thêm chi tiêu",
      onClick: onExpense,
    },
    {
      description: "Đối chiếu tiền đang có.",
      icon: ClipboardCheck,
      label: "Kiểm kê số dư",
      onClick: onBalance,
    },
    {
      description: "Xem lại các ngày đã ghi.",
      icon: History,
      label: "Xem lịch sử",
      onClick: onHistory,
    },
  ];

  return (
    <section className="money-card money-quick-actions" aria-labelledby="quick-actions-title">
      <div className="money-section-heading">
        <div>
          <h2 id="quick-actions-title">Thao tác nhanh</h2>
          <p>Ghi dữ liệu quan trọng mà không phải tìm qua nhiều màn hình.</p>
        </div>
      </div>
      <div className="money-quick-action-grid">
        {actions.map((action) => (
          <QuickAction key={action.label} {...action} />
        ))}
      </div>
    </section>
  );
}

function QuickAction({
  description,
  icon: Icon,
  label,
  onClick,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="money-quick-action"
      onClick={onClick}
    >
      <span className="money-quick-action-icon" aria-hidden="true">
        <Icon size={21} />
      </span>
      <span className="money-quick-action-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}
