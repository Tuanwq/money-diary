import { useId } from "react";
import { formatMoneyInput } from "../../../../utils/money";

type CloseDayMoneyInputProps = {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function CloseDayMoneyInput({
  helperText,
  label,
  onChange,
  placeholder,
  value,
}: CloseDayMoneyInputProps) {
  const inputId = useId();
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="close-day-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="close-day-money-input">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          aria-describedby={helperId}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(formatMoneyInput(event.target.value))}
        />
        <span aria-hidden="true">đ</span>
      </div>
      {helperText && <p id={helperId}>{helperText}</p>}
    </div>
  );
}
