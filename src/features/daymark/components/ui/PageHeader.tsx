import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

export function PageHeader({ actions, eyebrow, subtitle, title }: PageHeaderProps) {
  return (
    <header className="daymark-page-header">
      <div className="min-w-0">
        {eyebrow && <p className="daymark-eyebrow">{eyebrow}</p>}
        <h1 className="daymark-page-title">{title}</h1>
        {subtitle && <p className="daymark-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="daymark-page-actions">{actions}</div>}
    </header>
  );
}
