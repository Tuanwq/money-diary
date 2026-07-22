type ExpenseModeSwitchProps = {
  mode: "meals" | "total";
  onChange: (mode: "meals" | "total") => void;
};

export function ExpenseModeSwitch({ mode, onChange }: ExpenseModeSwitchProps) {
  return (
    <div className="close-day-expense-mode" role="group" aria-label="Cách nhập chi tiêu">
      <button
        type="button"
        className={mode === "total" ? "is-active" : ""}
        aria-pressed={mode === "total"}
        onClick={() => onChange("total")}
      >
        Nhập tổng
      </button>
      <button
        type="button"
        className={mode === "meals" ? "is-active" : ""}
        aria-pressed={mode === "meals"}
        onClick={() => onChange("meals")}
      >
        Từng khoản
      </button>
    </div>
  );
}
