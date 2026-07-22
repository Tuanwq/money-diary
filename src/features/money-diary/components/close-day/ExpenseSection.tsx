import { ReceiptText } from "lucide-react";
import { OtherExpenseItemsInput } from "../../../../components/OtherExpenseItemsInput";
import { formatMoney } from "../../../../utils/money";
import { CloseDayMoneyInput } from "./CloseDayMoneyInput";
import { CloseDaySectionHeading } from "./CloseDaySectionHeading";
import { ExpenseModeSwitch } from "./ExpenseModeSwitch";
import type { CloseDayForm, CloseDayFormSetter } from "./types";

type ExpenseSectionProps = {
  expenseTotal: number;
  form: CloseDayForm;
  setForm: CloseDayFormSetter;
};

export function ExpenseSection({
  expenseTotal,
  form,
  setForm,
}: ExpenseSectionProps) {
  return (
    <section className="close-day-section close-day-expense">
      <div className="close-day-expense__header">
        <CloseDaySectionHeading
          description="Nhập tổng chi hoặc tách rõ từng khoản."
          icon={ReceiptText}
          title="Chi tiêu"
        />
        <ExpenseModeSwitch
          mode={form.expenseMode}
          onChange={(expenseMode) =>
            setForm((current) => ({ ...current, expenseMode }))
          }
        />
      </div>

      {form.expenseMode === "total" ? (
        <div className="close-day-expense__total">
          <CloseDayMoneyInput
            label="Tổng chi tiêu"
            value={form.expenseTotal}
            placeholder="VD: 120.000"
            onChange={(expenseTotalValue) =>
              setForm((current) => ({
                ...current,
                expenseTotal: expenseTotalValue,
              }))
            }
          />
        </div>
      ) : (
        <div className="close-day-expense__items">
          <CloseDayMoneyInput
            label="Ăn sáng"
            value={form.breakfast}
            placeholder="VD: 30.000"
            onChange={(breakfast) =>
              setForm((current) => ({ ...current, breakfast }))
            }
          />
          <CloseDayMoneyInput
            label="Ăn trưa"
            value={form.lunch}
            placeholder="VD: 50.000"
            onChange={(lunch) => setForm((current) => ({ ...current, lunch }))}
          />
          <CloseDayMoneyInput
            label="Ăn tối"
            value={form.dinner}
            placeholder="VD: 40.000"
            onChange={(dinner) =>
              setForm((current) => ({ ...current, dinner }))
            }
          />
          <div className="close-day-expense__other-items">
            <OtherExpenseItemsInput
              addButtonLabel="Thêm khoản chi"
              items={form.otherItems}
              onChange={(otherItems) =>
                setForm((current) => ({ ...current, otherItems }))
              }
            />
          </div>
        </div>
      )}

      <p className="close-day-expense__calculated-total" aria-live="polite">
        Tổng chi tiêu đang tính: <strong>{formatMoney(expenseTotal)}</strong>
      </p>
    </section>
  );
}
