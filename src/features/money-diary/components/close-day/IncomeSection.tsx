import { Banknote } from "lucide-react";
import { CloseDayMoneyInput } from "./CloseDayMoneyInput";
import { CloseDaySectionHeading } from "./CloseDaySectionHeading";
import type { CloseDayForm, CloseDayFormSetter } from "./types";

type IncomeSectionProps = {
  form: CloseDayForm;
  setForm: CloseDayFormSetter;
};

export function IncomeSection({ form, setForm }: IncomeSectionProps) {
  return (
    <section className="close-day-section close-day-income">
      <CloseDaySectionHeading
        description="Ghi tiền làm được, thưởng và tiền thực nhận."
        icon={Banknote}
        title="Thu nhập"
      />

      <div className="close-day-income__fields">
        <CloseDayMoneyInput
          label="Tiền làm được"
          value={form.income}
          placeholder="VD: 250.000"
          onChange={(income) => setForm((current) => ({ ...current, income }))}
        />
        <CloseDayMoneyInput
          label="Tiền thưởng"
          value={form.bonusMoney}
          placeholder="VD: 100.000"
          onChange={(bonusMoney) =>
            setForm((current) => ({ ...current, bonusMoney }))
          }
        />
        <CloseDayMoneyInput
          label="Tiền nhận"
          value={form.receivedMoney}
          placeholder="VD: 500.000"
          onChange={(receivedMoney) =>
            setForm((current) => ({ ...current, receivedMoney }))
          }
        />
      </div>
    </section>
  );
}
