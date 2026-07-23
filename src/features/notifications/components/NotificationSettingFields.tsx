import type { ReactNode } from "react";

type NotificationToggleRowProps = {
  checked: boolean;
  children?: ReactNode;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function NotificationToggleRow({
  checked,
  children,
  description,
  disabled,
  label,
  onChange,
}: NotificationToggleRowProps) {
  return (
    <div className="notification-setting-row">
      <div className="notification-setting-copy">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="notification-setting-control">
        {children}
        <label className="notification-switch">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span aria-hidden="true" />
          <span className="sr-only">
            {checked ? `Tắt ${label}` : `Bật ${label}`}
          </span>
        </label>
      </div>
    </div>
  );
}

export function NotificationTimeInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="notification-inline-field">
      <span>{label}</span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

