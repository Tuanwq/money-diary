import { Fuel, Plus, Trash2 } from "lucide-react";
import {
  HUB_OPERATING_COST_CATEGORIES,
  HUB_OPERATING_COST_LABELS,
} from "../../../../utils/hubProfit";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "../../../../utils/money";
import { HubSectionHeading } from "./HubSectionHeading";
import type {
  HubFormSetter,
  HubOperatingCostForm,
} from "./types";

type OperatingCostsSectionProps = {
  costs: HubOperatingCostForm[];
  setForm: HubFormSetter;
};

function createCost(
  category: HubOperatingCostForm["category"] = "fuel"
): HubOperatingCostForm {
  return {
    amount: "",
    category,
    id: crypto.randomUUID(),
    note: "",
  };
}

export function OperatingCostsSection({
  costs,
  setForm,
}: OperatingCostsSectionProps) {
  const total = costs.reduce(
    (sum, cost) => sum + parseMoneyInput(cost.amount),
    0
  );

  function addCost(category?: HubOperatingCostForm["category"]) {
    setForm((current) => ({
      ...current,
      operatingCosts: [...current.operatingCosts, createCost(category)],
    }));
  }

  function updateCost(
    id: string,
    nextCost: Partial<HubOperatingCostForm>
  ) {
    setForm((current) => ({
      ...current,
      operatingCosts: current.operatingCosts.map((cost) =>
        cost.id === id ? { ...cost, ...nextCost } : cost
      ),
    }));
  }

  function deleteCost(id: string) {
    setForm((current) => ({
      ...current,
      operatingCosts: current.operatingCosts.filter((cost) => cost.id !== id),
    }));
  }

  return (
    <section className="hub-form-section hub-operating-costs">
      <HubSectionHeading
        icon={Fuel}
        title="Chi phí vận hành"
        description="Chỉ nhập khoản phát sinh trực tiếp cho ca này để tính lợi nhuận thực."
      />

      <div
        className="hub-cost-category-chips"
        aria-label="Thêm nhanh loại chi phí"
      >
        {HUB_OPERATING_COST_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => addCost(category)}
          >
            <Plus size={14} aria-hidden="true" />
            {HUB_OPERATING_COST_LABELS[category]}
          </button>
        ))}
      </div>

      {costs.length === 0 ? (
        <p className="hub-cost-empty">
          Chưa có chi phí. Ca này đang có lợi nhuận bằng tổng thu nhập.
        </p>
      ) : (
        <div className="hub-operating-cost-list">
          {costs.map((cost) => (
            <div className="hub-operating-cost-row" key={cost.id}>
              <label className="hub-field">
                <span>Loại chi phí</span>
                <select
                  value={cost.category}
                  onChange={(event) =>
                    updateCost(cost.id, {
                      category: event.target
                        .value as HubOperatingCostForm["category"],
                    })
                  }
                >
                  {HUB_OPERATING_COST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {HUB_OPERATING_COST_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="hub-field">
                <span>Số tiền</span>
                <span className="hub-money-input">
                  <input
                    inputMode="numeric"
                    placeholder="VD: 30.000"
                    value={cost.amount}
                    onChange={(event) =>
                      updateCost(cost.id, {
                        amount: formatMoneyInput(event.target.value),
                      })
                    }
                  />
                  <span>đ</span>
                </span>
              </label>

              <label className="hub-field hub-operating-cost-row__note">
                <span>Chi tiết</span>
                <input
                  maxLength={120}
                  placeholder="Không bắt buộc"
                  value={cost.note}
                  onChange={(event) =>
                    updateCost(cost.id, { note: event.target.value })
                  }
                />
              </label>

              <button
                type="button"
                className="hub-icon-button hub-icon-button--danger"
                aria-label={`Xóa chi phí ${HUB_OPERATING_COST_LABELS[cost.category]}`}
                onClick={() => deleteCost(cost.id)}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="hub-operating-costs__total">
        <span>Tổng chi phí ca</span>
        <strong className="money-value">{formatMoney(total)}</strong>
      </div>
    </section>
  );
}
