import { Layers3, Plus, Trash2 } from "lucide-react";
import { formatMoneyInput } from "../../../../utils/money";
import { HubSectionHeading } from "./HubSectionHeading";
import type { HubForm, HubJoinForm } from "./types";

type MatchedOrderSectionProps = {
  joins: HubForm["joins"];
  remainingSingleOrders: number;
  canUseJoinType: (type: number) => boolean;
  onAdd: (type?: number) => void;
  onUpdate: (id: string, nextRow: Partial<HubJoinForm>) => void;
  onDelete: (id: string) => void;
};

const QUICK_JOIN_TYPES = [2, 3, 4, 5];

export function MatchedOrderSection({
  joins,
  remainingSingleOrders,
  canUseJoinType,
  onAdd,
  onUpdate,
  onDelete,
}: MatchedOrderSectionProps) {
  return (
    <section className="hub-form-section hub-matched-order-section">
      <HubSectionHeading
        icon={Layers3}
        title="Đơn ghép"
        description="Chuyển số đơn lẻ đã dùng sang đúng loại đơn ghép."
      />

      <div className="hub-join-toolbar" aria-label="Thêm nhanh loại đơn ghép">
        {QUICK_JOIN_TYPES.map((type) => {
          const enabled = canUseJoinType(type);
          const selected = joins.some((join) => Number(join.type) === type);

          return (
            <button
              key={type}
              type="button"
              disabled={!enabled}
              className={`hub-join-chip${selected ? " is-selected" : ""}`}
              title={enabled ? `Thêm ghép ${type}` : `Cần còn ít nhất ${type} đơn lẻ`}
              onClick={() => onAdd(type)}
            >
              <Plus size={14} aria-hidden="true" />
              Ghép {type}
            </button>
          );
        })}
        <button
          type="button"
          className="hub-join-chip hub-join-chip--custom"
          disabled={!canUseJoinType(2)}
          onClick={() => onAdd()}
        >
          <Plus size={14} aria-hidden="true" />
          Loại khác
        </button>
      </div>

      <p className="hub-field-helper" aria-live="polite">
        Còn {remainingSingleOrders} đơn lẻ có thể chuyển sang đơn ghép. Nút không đủ đơn sẽ tự khóa.
      </p>

      {joins.length > 0 && (
        <div className="hub-join-list">
          {joins.map((row, index) => (
            <div className="hub-join-row" key={row.id}>
              <p className="hub-join-row__title">Lượt ghép {index + 1}</p>
              <label className="hub-field">
                <span>Loại ghép</span>
                <input
                  inputMode="numeric"
                  value={row.type}
                  onChange={(event) =>
                    onUpdate(row.id, {
                      type: event.target.value.replace(/[^\d]/g, ""),
                    })
                  }
                />
              </label>
              <label className="hub-field">
                <span>Số lượt</span>
                <input
                  inputMode="numeric"
                  value={row.quantity}
                  onChange={(event) =>
                    onUpdate(row.id, {
                      quantity: formatMoneyInput(event.target.value),
                    })
                  }
                />
              </label>
              <label className="hub-field">
                <span>Giá mỗi lượt</span>
                <span className="hub-money-input">
                  <input
                    inputMode="numeric"
                    value={row.price}
                    onChange={(event) =>
                      onUpdate(row.id, {
                        price: formatMoneyInput(event.target.value),
                      })
                    }
                  />
                  <span>đ</span>
                </span>
              </label>
              <button
                type="button"
                className="hub-icon-button hub-icon-button--danger"
                aria-label={`Xóa lượt ghép ${index + 1}`}
                title="Xóa lượt ghép"
                onClick={() => onDelete(row.id)}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
