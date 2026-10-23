import { PiggyBank } from "lucide-react";
import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import "../pages/SavingsPage.css";

type Props = {
  ledger: AccountLedgerData;
  date: string;
  onOpen: () => void;
};

export function SavingsTodayCard({ ledger, date, onOpen }: Props) {
  const item = (ledger.savingsAllocations ?? []).find((result) => result.date === date && result.status === "proposed");
  const rule = ledger.savingsRules?.find((candidate) => candidate.id === item?.ruleId);
  if (!item || !rule) return null;
  return <section className="money-card savings-today-card" aria-label="Tiết kiệm hôm nay">
    <div className="savings-section-heading"><span><PiggyBank size={19} /> Tiết kiệm hôm nay</span>
      <button className="savings-text-button" type="button" onClick={onOpen}>Mở Tiết kiệm →</button></div>
    <p className="savings-today-message">Quy tắc {rule.name} có đề xuất mới. Mở Tiết kiệm để xem số tiền và quyết định.</p>
    <div className="savings-card-actions"><button type="button" className="savings-primary-button"
      onClick={onOpen}>Xem đề xuất</button></div>
  </section>;
}
