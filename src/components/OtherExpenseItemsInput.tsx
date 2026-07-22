import { Check, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { OtherExpenseLabelManager } from "./OtherExpenseLabelManager";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/money";
import {
  createOtherExpenseItemForm,
  getOtherExpenseItemsTotal,
  type OtherExpenseItemForm,
} from "../utils/otherExpenseForms";

type OtherExpenseItemsInputProps = {
  addButtonLabel?: string;
  items: OtherExpenseItemForm[];
  onChange: (items: OtherExpenseItemForm[]) => void;
};

function hasItemData(item: OtherExpenseItemForm) {
  return parseMoneyInput(item.amount) > 0 || Boolean(item.label.trim());
}

export function OtherExpenseItemsInput({
  addButtonLabel = "Thêm khoản khác",
  items,
  onChange,
}: OtherExpenseItemsInputProps) {
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set());
  const visibleItems = useMemo(
    () => items.filter((item) => hasItemData(item) || editingIds.has(item.id)),
    [editingIds, items]
  );
  const total = getOtherExpenseItemsTotal(items);

  function updateItem(id: string, nextItem: Partial<OtherExpenseItemForm>) {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...nextItem } : item))
    );
  }

  function addItem() {
    const reusableBlankItem = items.find(
      (item) => !hasItemData(item) && !editingIds.has(item.id)
    );
    const item = reusableBlankItem ?? createOtherExpenseItemForm();

    if (!reusableBlankItem) onChange([...items, item]);
    setEditingIds((current) => new Set(current).add(item.id));
  }

  function finishEditing(item: OtherExpenseItemForm) {
    if (!hasItemData(item)) {
      onChange(items.filter((current) => current.id !== item.id));
    }

    setEditingIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  function deleteItem(item: OtherExpenseItemForm) {
    const confirmed = confirm(
      `Xóa ${item.label.trim() ? `khoản "${item.label.trim()}"` : "khoản chi này"}?`
    );
    if (!confirmed) return;

    onChange(items.filter((current) => current.id !== item.id));
    setEditingIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  return (
    <div className="other-expense-list">
      <div className="other-expense-list__heading">
        <div><h3>Khoản khác</h3><p>Ghi các khoản ngoài ăn uống theo nhãn.</p></div>
        <strong>Tổng {formatMoney(total)}</strong>
      </div>

      {visibleItems.length === 0 ? (
        <p className="other-expense-list__empty">Chưa có khoản chi khác.</p>
      ) : (
        <div className="other-expense-list__items">
          {visibleItems.map((item, index) => {
            const isEditing = editingIds.has(item.id);

            return (
              <article key={item.id} className="other-expense-item">
                <header>
                  <div>
                    <span>Khoản khác {index + 1}</span>
                    {!isEditing && <strong>{item.label || "Chưa chọn nhãn"}</strong>}
                  </div>

                  {!isEditing && (
                    <details className="other-expense-item__menu">
                      <summary aria-label={`Mở thao tác cho khoản khác ${index + 1}`}>
                        <MoreHorizontal size={19} aria-hidden="true" />
                      </summary>
                      <div>
                        <button type="button" onClick={() => setEditingIds((current) => new Set(current).add(item.id))}>
                          <Pencil size={15} aria-hidden="true" />Sửa
                        </button>
                        <button type="button" className="is-danger" onClick={() => deleteItem(item)}>
                          <Trash2 size={15} aria-hidden="true" />Xóa
                        </button>
                      </div>
                    </details>
                  )}
                </header>

                {isEditing ? (
                  <div className="other-expense-item__editor">
                    <div className="other-expense-item__amount">
                      <label htmlFor={`other-expense-${item.id}`}>Số tiền</label>
                      <span>
                        <input
                          id={`other-expense-${item.id}`}
                          type="text"
                          inputMode="numeric"
                          value={item.amount}
                          onChange={(event) => updateItem(item.id, { amount: formatMoneyInput(event.target.value) })}
                          placeholder="VD: 20.000"
                        />
                        <small>đ</small>
                      </span>
                    </div>
                    <OtherExpenseLabelManager
                      value={item.label}
                      onChange={(label) => updateItem(item.id, { label })}
                      className="other-expense-item__label"
                    />
                    <button type="button" className="other-expense-item__done" onClick={() => finishEditing(item)}>
                      <Check size={16} aria-hidden="true" />Xong
                    </button>
                  </div>
                ) : (
                  <div className="other-expense-item__summary">
                    <span>Số tiền</span>
                    <strong>{formatMoney(parseMoneyInput(item.amount))}</strong>
                    <span>Nhãn</span>
                    <strong>{item.label || "Chưa chọn"}</strong>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <button type="button" onClick={addItem} className="other-expense-list__add">
        <Plus size={17} aria-hidden="true" />{addButtonLabel}
      </button>
    </div>
  );
}
