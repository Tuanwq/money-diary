import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type HubEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function HubEmptyState({ title, description, action }: HubEmptyStateProps) {
  return (
    <div className="hub-empty-state">
      <Inbox size={22} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
