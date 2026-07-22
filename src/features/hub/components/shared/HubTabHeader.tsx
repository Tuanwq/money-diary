import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type HubTabHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function HubTabHeader({
  icon: Icon,
  title,
  description,
  action,
}: HubTabHeaderProps) {
  return (
    <header className="hub-tab-header">
      <div className="hub-tab-header__title-group">
        <span className="hub-tab-header__icon" aria-hidden="true">
          <Icon size={21} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {action && <div className="hub-tab-header__action">{action}</div>}
    </header>
  );
}
