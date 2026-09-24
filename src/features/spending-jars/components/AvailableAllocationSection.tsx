import { Banknote, CircleDollarSign, Landmark, WalletCards } from "lucide-react";
import { calculateAccountBalance, type FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { getAccountAllocation, getAccountAvailableToAllocate, type JarLedger } from "../domain/jarModel.ts";
import { formatMoney } from "../../../utils/money.ts";

const accountIcons = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: WalletCards,
  other: CircleDollarSign,
};

export function AvailableAllocationSection({ ledger, accounts }: {
  ledger: JarLedger;
  accounts: FinancialAccount[];
}) {
  const rows = accounts.map((account) => ({
    account,
    balance: calculateAccountBalance(account, ledger.transactions),
    reserved: getAccountAllocation(ledger, account.id),
    available: getAccountAvailableToAllocate(ledger, account.id),
  }));
  const totalAvailable = rows.reduce((sum, row) => sum + row.available, 0);

  return <section className="jars-accounts" aria-labelledby="jars-accounts-title">
    <div className="jars-accounts-heading"><div><h2 id="jars-accounts-title">Tiền có thể phân bổ</h2><p>Tiền chưa được dành cho bất kỳ hũ nào.</p></div>
      <div className="jars-accounts-total"><span>Tổng khả dụng</span><strong>{formatMoney(totalAvailable)}</strong></div>
    </div>
    {rows.length === 0 ? <p className="jars-section-empty">Chưa có tài khoản để phân bổ tiền.</p> : <>
      {totalAvailable === 0 && <p className="jars-section-empty">Hiện chưa còn tiền có thể phân bổ từ các tài khoản.</p>}
      <div className="jars-account-grid">{rows.map(({ account, balance, reserved, available }) => {
        const Icon = accountIcons[account.type];
        return <div className="jars-account-row" key={account.id}>
          <span className="jars-account-icon"><Icon aria-hidden="true" size={18} /></span>
          <span className="jars-account-info"><strong>{account.name}</strong><small>Số dư {formatMoney(balance)} · Đã dành {formatMoney(reserved)}</small></span>
          <strong className="jars-account-available">{formatMoney(available)}</strong>
          {reserved > balance && <small className="jars-account-warning">Tiền đã dành vượt số dư thực tế. Hãy bổ sung tiền hoặc giải phóng phân bổ.</small>}
        </div>;
      })}</div>
    </>}
  </section>;
}
