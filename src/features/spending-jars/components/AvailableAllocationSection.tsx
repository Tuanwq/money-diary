import { Banknote, CircleDollarSign, Landmark, WalletCards } from "lucide-react";
import { type FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { getFinancialPosition } from "../domain/financialPosition.ts";
import { formatMoney } from "../../../utils/money.ts";

const accountIcons = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: WalletCards,
  other: CircleDollarSign,
};

export function AvailableAllocationSection({ position, accounts }: {
  position: ReturnType<typeof getFinancialPosition>;
  accounts: FinancialAccount[];
}) {
  const rows = accounts.map((account) => ({ account,
    position: position.accounts.find((item) => item.accountId === account.id) }));
  const totalAvailable = position.allocationCapacity;

  return <section className="jars-accounts" aria-labelledby="jars-accounts-title">
    <div className="jars-accounts-heading"><div><h2 id="jars-accounts-title">Chưa phân bổ theo tài khoản</h2>
      <p>Chỉ tài khoản được phép dùng cho hũ mới có thể chia thêm.</p></div></div>
    {rows.length === 0 ? <p className="jars-section-empty">Chưa có tài khoản để phân bổ tiền.</p> : <>
      {totalAvailable === 0 && <p className="jars-section-empty">Hiện chưa còn tiền có thể phân bổ từ các tài khoản.</p>}
      <div className="jars-account-grid">{rows.map(({ account, position: row }) => {
        const Icon = accountIcons[account.type];
        return <div className="jars-account-row" key={account.id}>
          <span className="jars-account-icon"><Icon aria-hidden="true" size={18} /></span>
          <span className="jars-account-info"><strong>{account.name}</strong><small>Thực có {formatMoney(row?.liquid ?? 0)} · Đã dành {formatMoney(row?.reserved ?? 0)}{row?.outside ? ` · Ở ngoài ${formatMoney(row.outside)}` : ""}</small></span>
          <strong className="jars-account-available">{formatMoney(row?.allocationCapacity ?? 0)}</strong>
          {row?.eligibility === "needs_review" && <small className="jars-account-warning">Cần xác nhận tài khoản này có thể dùng cho hũ trong Sổ tài khoản.</small>}
          {row?.eligibility === "excluded" && <small>Không dùng cho hũ.</small>}
          {(row?.shortfall ?? 0) > 0 && <small className="jars-account-warning">Tiền đã dành vượt tiền thực có {formatMoney(row?.shortfall ?? 0)}.</small>}
        </div>;
      })}</div>
    </>}
  </section>;
}
