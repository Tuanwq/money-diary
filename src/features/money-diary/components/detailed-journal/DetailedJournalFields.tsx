import type { ReactNode } from "react";
import { formatMoneyInput } from "../../../../utils/money";

type FieldShellProps = {
  children: ReactNode;
  label: string;
  htmlFor: string;
  helper?: string;
  muted?: boolean;
};

export function FieldShell({
  children,
  label,
  htmlFor,
  helper,
  muted = false,
}: FieldShellProps) {
  return (
    <div className={`detailed-journal-field${muted ? " is-muted" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {helper && <small>{helper}</small>}
    </div>
  );
}

export function MoneyField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldShell htmlFor={id} label={label}>
      <span className="detailed-journal-money-input">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(formatMoneyInput(event.target.value))}
        />
        <span>đ</span>
      </span>
    </FieldShell>
  );
}

export function NumberField({
  id,
  label,
  value,
  placeholder,
  suffix,
  decimal = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  suffix: string;
  decimal?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <FieldShell htmlFor={id} label={label}>
      <span className="detailed-journal-number-input">
        <input
          id={id}
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            if (!decimal) {
              onChange(event.target.value.replace(/[^\d]/g, ""));
              return;
            }

            const normalized = event.target.value
              .replace(/[^\d.,]/g, "")
              .replace(",", ".");
            const [whole = "", ...decimals] = normalized.split(".");
            onChange(decimals.length > 0 ? `${whole}.${decimals.join("")}` : whole);
          }}
        />
        <span>{suffix}</span>
      </span>
    </FieldShell>
  );
}

export function SectionHeading({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="detailed-journal-section-heading">
      <span aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
