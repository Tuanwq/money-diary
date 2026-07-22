import type { LucideIcon } from "lucide-react";

type HubSectionHeadingProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function HubSectionHeading({
  icon: Icon,
  title,
  description,
}: HubSectionHeadingProps) {
  return (
    <div className="hub-section-heading">
      <span className="hub-section-heading__icon" aria-hidden="true">
        <Icon size={19} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
