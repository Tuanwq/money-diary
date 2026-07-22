import type { LucideIcon } from "lucide-react";

type CloseDaySectionHeadingProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function CloseDaySectionHeading({
  description,
  icon: Icon,
  title,
}: CloseDaySectionHeadingProps) {
  return (
    <div className="close-day-section-heading">
      <span className="close-day-section-heading__icon" aria-hidden="true">
        <Icon size={19} strokeWidth={2} />
      </span>
      <div className="close-day-section-heading__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
