import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  action?: React.ReactNode;
  icon: LucideIcon;
  message: string;
  title: string;
};

export function EmptyState({ action, icon: Icon, message, title }: EmptyStateProps) {
  return (
    <div className="daymark-empty-state">
      <Icon aria-hidden="true" size={28} />
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
