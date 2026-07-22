import { BadgeDollarSign } from "lucide-react";
import { formatMoneyInput } from "../../../../utils/money";
import { HubSectionHeading } from "./HubSectionHeading";
import type { HubFormSetter } from "./types";

type OtherIncomeSectionProps = {
  value: string;
  setForm: HubFormSetter;
};

export function OtherIncomeSection({ value, setForm }: OtherIncomeSectionProps) {
  return (
    <section className="hub-form-section hub-other-income-section">
      <HubSectionHeading
        icon={BadgeDollarSign}
        title="Thu nhập khác"
        description="Ghi tip hoặc khoản hỗ trợ; số tiền này được cộng riêng vào tổng thu nhập ca."
      />
      <label className="hub-field">
        <span>Số tiền</span>
        <span className="hub-money-input">
          <input
            inputMode="numeric"
            value={value}
            placeholder="VD: 50.000"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                extraIncome: formatMoneyInput(event.target.value),
              }))
            }
          />
          <span>đ</span>
        </span>
      </label>
    </section>
  );
}
