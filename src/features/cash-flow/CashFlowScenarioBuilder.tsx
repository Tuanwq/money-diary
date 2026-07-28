import {
  CalendarOff,
  CircleDollarSign,
  Plus,
  Repeat2,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from "../../utils/money";
import type {
  CashFlowAccountBalance,
  CashFlowSimulationAdjustment,
} from "./cashFlowForecastModel";

type SimulationAdjustmentType = CashFlowSimulationAdjustment["type"];

const ADJUSTMENT_TYPE_LABELS: Record<SimulationAdjustmentType, string> = {
  daily_expense: "Chi tiêu mỗi ngày",
  daily_income: "Thu nhập mỗi ngày",
  expense: "Khoản chi một lần",
  income: "Thu nhập thêm",
  rest: "Nghỉ làm",
};

const ADJUSTMENT_TYPE_ICONS = {
  daily_expense: Repeat2,
  daily_income: Repeat2,
  expense: CircleDollarSign,
  income: TrendingUp,
  rest: CalendarOff,
} satisfies Record<SimulationAdjustmentType, typeof CalendarOff>;

function createAdjustment({
  accountId,
  fromDate,
  id = crypto.randomUUID(),
  toDate,
  type,
}: {
  accountId?: string;
  fromDate: string;
  id?: string;
  toDate: string;
  type: SimulationAdjustmentType;
}): CashFlowSimulationAdjustment {
  if (type === "rest") {
    return {
      days: 1,
      id,
      label: "Nghỉ làm",
      startDate: fromDate,
      type,
    };
  }

  if (type === "income" || type === "expense") {
    return {
      ...(accountId ? { accountId } : {}),
      amount: 0,
      date: fromDate,
      id,
      label: type === "income" ? "Thu nhập thêm" : "Khoản chi dự kiến",
      type,
    };
  }

  return {
    ...(accountId ? { accountId } : {}),
    amount: 0,
    endDate: toDate,
    id,
    label:
      type === "daily_income"
        ? "Thu nhập thêm mỗi ngày"
        : "Chi tiêu thêm mỗi ngày",
    startDate: fromDate,
    type,
  };
}

function getMoneyInputValue(amount: number) {
  return amount > 0 ? formatMoneyInput(String(amount)) : "";
}

export function CashFlowScenarioBuilder({
  accounts,
  adjustments,
  fromDate,
  onChange,
  toDate,
}: {
  accounts: CashFlowAccountBalance[];
  adjustments: CashFlowSimulationAdjustment[];
  fromDate: string;
  onChange: (adjustments: CashFlowSimulationAdjustment[]) => void;
  toDate: string;
}) {
  const [newType, setNewType] =
    useState<SimulationAdjustmentType>("expense");
  const defaultAccountId = accounts[0]?.id;

  function appendAdjustment(
    type: SimulationAdjustmentType,
    patch?: Partial<CashFlowSimulationAdjustment>
  ) {
    const adjustment = createAdjustment({
      accountId: defaultAccountId,
      fromDate,
      toDate,
      type,
    });

    onChange([
      ...adjustments,
      { ...adjustment, ...patch } as CashFlowSimulationAdjustment,
    ]);
  }

  function replaceAdjustment(next: CashFlowSimulationAdjustment) {
    onChange(
      adjustments.map((adjustment) =>
        adjustment.id === next.id ? next : adjustment
      )
    );
  }

  function changeAdjustmentType(
    adjustment: CashFlowSimulationAdjustment,
    type: SimulationAdjustmentType
  ) {
    replaceAdjustment(
      createAdjustment({
        accountId: defaultAccountId,
        fromDate,
        id: adjustment.id,
        toDate,
        type,
      })
    );
  }

  return (
    <div className="cash-flow-scenario-builder">
      <div className="cash-flow-simulation-presets" aria-label="Mẫu kịch bản">
        <span>Mẫu nhanh</span>
        <button
          onClick={() =>
            appendAdjustment("rest", {
              days: 3,
              label: "Nghỉ 3 ngày",
            })
          }
          type="button"
        >
          Nghỉ 3 ngày
        </button>
        <button
          onClick={() =>
            appendAdjustment("expense", {
              amount: 5_000_000,
              label: "Mua món 5 triệu",
            })
          }
          type="button"
        >
          Mua món 5 triệu
        </button>
        <button
          onClick={() =>
            appendAdjustment("income", {
              amount: 2_000_000,
              label: "Thu thêm 2 triệu",
            })
          }
          type="button"
        >
          Thu thêm 2 triệu
        </button>
        <button
          onClick={() =>
            appendAdjustment("daily_expense", {
              amount: 100_000,
              label: "Chi thêm 100.000 đ/ngày",
            })
          }
          type="button"
        >
          Chi thêm 100.000 đ/ngày
        </button>
      </div>

      <div className="cash-flow-simulation-toolbar">
        <label>
          <span>Loại điều chỉnh</span>
          <select
            onChange={(event) =>
              setNewType(event.target.value as SimulationAdjustmentType)
            }
            value={newType}
          >
            {(
              Object.entries(ADJUSTMENT_TYPE_LABELS) as [
                SimulationAdjustmentType,
                string,
              ][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="notification-secondary-button"
          onClick={() => appendAdjustment(newType)}
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          Thêm điều chỉnh
        </button>
        <button
          className="cash-flow-reset-simulation"
          disabled={adjustments.length === 0}
          onClick={() => onChange([])}
          type="button"
        >
          Xóa toàn bộ
        </button>
      </div>

      {adjustments.length === 0 ? (
        <div className="cash-flow-simulation-empty">
          <CircleDollarSign aria-hidden="true" size={22} />
          <div>
            <strong>Chưa có điều chỉnh nào</strong>
            <span>
              Chọn một mẫu nhanh hoặc thêm nhiều điều chỉnh để dựng kịch bản
              riêng.
            </span>
          </div>
        </div>
      ) : (
        <div className="cash-flow-simulation-list">
          {adjustments.map((adjustment, index) => {
            const AdjustmentIcon = ADJUSTMENT_TYPE_ICONS[adjustment.type];

            return (
              <article
                className="cash-flow-simulation-adjustment"
                key={adjustment.id}
              >
                <header>
                  <span className={`is-${adjustment.type}`}>
                    <AdjustmentIcon aria-hidden="true" size={17} />
                  </span>
                  <strong>Điều chỉnh {index + 1}</strong>
                  <select
                    aria-label={`Loại điều chỉnh ${index + 1}`}
                    onChange={(event) =>
                      changeAdjustmentType(
                        adjustment,
                        event.target.value as SimulationAdjustmentType
                      )
                    }
                    value={adjustment.type}
                  >
                    {(
                      Object.entries(ADJUSTMENT_TYPE_LABELS) as [
                        SimulationAdjustmentType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    aria-label={`Xóa điều chỉnh ${index + 1}`}
                    className="cash-flow-icon-button is-danger"
                    onClick={() =>
                      onChange(
                        adjustments.filter(
                          (item) => item.id !== adjustment.id
                        )
                      )
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </header>

                <div className="cash-flow-simulation-adjustment-fields">
                  <label className="cash-flow-field">
                    <span>Tên kịch bản</span>
                    <input
                      maxLength={60}
                      onChange={(event) =>
                        replaceAdjustment({
                          ...adjustment,
                          label: event.target.value,
                        })
                      }
                      placeholder="VD: Nghỉ về quê"
                      value={adjustment.label}
                    />
                  </label>

                  {adjustment.type === "rest" ? (
                    <>
                      <label className="cash-flow-field">
                        <span>Số ngày nghỉ</span>
                        <input
                          inputMode="numeric"
                          min="1"
                          onChange={(event) =>
                            replaceAdjustment({
                              ...adjustment,
                              days: Math.max(
                                Number.parseInt(event.target.value, 10) || 0,
                                0
                              ),
                            })
                          }
                          type="number"
                          value={adjustment.days}
                        />
                      </label>
                      <label className="cash-flow-field">
                        <span>Bắt đầu nghỉ</span>
                        <input
                          max={toDate}
                          min={fromDate}
                          onChange={(event) =>
                            replaceAdjustment({
                              ...adjustment,
                              startDate: event.target.value,
                            })
                          }
                          type="date"
                          value={adjustment.startDate}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="cash-flow-field">
                        <span>
                          {adjustment.type.startsWith("daily_")
                            ? "Số tiền mỗi ngày"
                            : "Số tiền"}
                        </span>
                        <div className="cash-flow-money-input">
                          <input
                            inputMode="numeric"
                            onChange={(event) =>
                              replaceAdjustment({
                                ...adjustment,
                                amount: parseMoneyInput(event.target.value),
                              })
                            }
                            placeholder="VD: 500.000"
                            value={getMoneyInputValue(adjustment.amount)}
                          />
                          <span>đ</span>
                        </div>
                      </label>

                      {adjustment.type === "income" ||
                      adjustment.type === "expense" ? (
                        <label className="cash-flow-field">
                          <span>Ngày áp dụng</span>
                          <input
                            max={toDate}
                            min={fromDate}
                            onChange={(event) =>
                              replaceAdjustment({
                                ...adjustment,
                                date: event.target.value,
                              })
                            }
                            type="date"
                            value={adjustment.date}
                          />
                        </label>
                      ) : (
                        <>
                          <label className="cash-flow-field">
                            <span>Từ ngày</span>
                            <input
                              max={adjustment.endDate}
                              min={fromDate}
                              onChange={(event) =>
                                replaceAdjustment({
                                  ...adjustment,
                                  startDate: event.target.value,
                                })
                              }
                              type="date"
                              value={adjustment.startDate}
                            />
                          </label>
                          <label className="cash-flow-field">
                            <span>Đến ngày</span>
                            <input
                              max={toDate}
                              min={adjustment.startDate}
                              onChange={(event) =>
                                replaceAdjustment({
                                  ...adjustment,
                                  endDate: event.target.value,
                                })
                              }
                              type="date"
                              value={adjustment.endDate}
                            />
                          </label>
                        </>
                      )}

                      <label className="cash-flow-field">
                        <span>
                          {adjustment.type === "income" ||
                          adjustment.type === "daily_income"
                            ? "Cộng vào tài khoản"
                            : "Trừ từ tài khoản"}
                        </span>
                        <select
                          disabled={accounts.length === 0}
                          onChange={(event) =>
                            replaceAdjustment({
                              ...adjustment,
                              accountId: event.target.value || undefined,
                            })
                          }
                          value={adjustment.accountId ?? ""}
                        >
                          <option value="">
                            {accounts.length === 0
                              ? "Chưa có Sổ tài khoản"
                              : "Không phân bổ tài khoản"}
                          </option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} · {formatMoney(account.balance)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
