import { OtherExpenseLabelManager } from "./OtherExpenseLabelManager";
import { formatMoney, formatMoneyInput } from "../utils/money";
import {
  createOtherExpenseItemForm,
  getOtherExpenseItemsTotal,
  type OtherExpenseItemForm,
} from "../utils/otherExpenseForms";

type OtherExpenseItemsInputProps = {
  items: OtherExpenseItemForm[];
  onChange: (items: OtherExpenseItemForm[]) => void;
};

export function OtherExpenseItemsInput({
  items,
  onChange,
}: OtherExpenseItemsInputProps) {
  const visibleItems = items.length > 0 ? items : [createOtherExpenseItemForm()];
  const total = getOtherExpenseItemsTotal(visibleItems);

  function updateItem(id: string, nextItem: Partial<OtherExpenseItemForm>) {
    onChange(
      visibleItems.map((item) =>
        item.id === id ? { ...item, ...nextItem } : item
      )
    );
  }

  function addItem() {
    onChange([...visibleItems, createOtherExpenseItemForm()]);
  }

  function deleteItem(id: string) {
    const nextItems = visibleItems.filter((item) => item.id !== id);

    onChange(nextItems.length > 0 ? nextItems : [createOtherExpenseItemForm()]);
  }

  return (
    <div className="md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">Khoản khác</label>
        <p className="text-sm font-bold text-emerald-700">
          Tổng: {formatMoney(total)}
        </p>
      </div>

      <div className="mt-2 grid gap-3">
        {visibleItems.map((item, index) => (
          <div key={item.id} className="app-soft-card rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-700">
                Khoản khác {index + 1}
              </p>

              {visibleItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="min-h-10 rounded-lg bg-red-50 px-3 py-1 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  Xóa dòng
                </button>
              )}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <label className="text-sm font-medium">Số tiền</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.amount}
                  onChange={(event) =>
                    updateItem(item.id, {
                      amount: formatMoneyInput(event.target.value),
                    })
                  }
                  placeholder="VD: 20.000"
                  className="app-input mt-1 w-full rounded-xl border bg-white px-3 py-2"
                />
              </div>

              <OtherExpenseLabelManager
                value={item.label}
                onChange={(label) => updateItem(item.id, { label })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="app-primary-button mt-3 rounded-xl px-4 py-2 text-sm font-bold"
      >
        Thêm khoản khác
      </button>
    </div>
  );
}
