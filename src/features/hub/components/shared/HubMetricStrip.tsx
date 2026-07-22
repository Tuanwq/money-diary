import type { LucideIcon } from "lucide-react";

export type HubMetricItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "income" | "warning" | "danger";
};

type HubMetricStripProps = {
  items: HubMetricItem[];
  ariaLabel: string;
};

export function HubMetricStrip({ items, ariaLabel }: HubMetricStripProps) {
  return (
    <dl
      className={`hub-metric-strip hub-metric-strip--${Math.min(items.length, 5)}`}
      aria-label={ariaLabel}
    >
      {items.map(({ label, value, icon: Icon, tone = "default" }) => (
        <div key={label} className={`hub-metric-strip__item is-${tone}`}>
          <Icon size={17} aria-hidden="true" />
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
