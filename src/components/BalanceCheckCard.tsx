import { getBalanceStatus, getBalanceStatusClass } from "../utils/balance";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../utils/money";

type BalanceCheckFormValue = {
  date: string;
  cash: string;
  bank: string;
  note: string;
};

type BalanceCheckCardProps = {
  title?: string;
  form: BalanceCheckFormValue;
  maxDate: string;
  appMoney: number;
  onSubmit: (event: React.FormEvent) => void;
  onDateChange: (date: string) => void;
  onCashChange: (value: string) => void;
  onBankChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

export function BalanceCheckCard({
  title = "Kiểm kê số dư hôm nay",
  form,
  maxDate,
  appMoney,
  onSubmit,
  onDateChange,
  onCashChange,
  onBankChange,
  onNoteChange,
}: BalanceCheckCardProps) {
  const cash = parseMoneyInput(form.cash);
  const bank = parseMoneyInput(form.bank);
  const checkedMoney = cash + bank;
  const difference = checkedMoney - appMoney;

  return (
    <section className="app-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-slate-500">
            Đối chiếu tiền thật ngoài đời với số tiền app đang tính.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${getBalanceStatusClass(
            difference
          )}`}
        >
          {getBalanceStatus(difference)}
        </span>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Ngày kiểm kê</label>
            <input
              type="date"
              value={form.date}
              max={maxDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tiền mặt</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.cash}
              onChange={(e) => onCashChange(formatMoneyInput(e.target.value))}
              placeholder="VD: 500.000"
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tiền tài khoản</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.bank}
              onChange={(e) => onBankChange(formatMoneyInput(e.target.value))}
              placeholder="VD: 3.000.000"
              className="app-input mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-sm text-slate-500">App tính hiện có</p>
            <p className="font-bold">{formatMoney(appMoney)}</p>
          </div>

          <div className="rounded-xl bg-cyan-50 p-3">
            <p className="text-sm text-slate-500">Bạn kiểm kê</p>
            <p className="font-bold">{formatMoney(checkedMoney)}</p>
          </div>

          <div
            className={`rounded-xl p-3 ${getBalanceStatusClass(difference)}`}
          >
            <p className="text-sm opacity-80">Chênh lệch</p>
            <p className="font-bold">{formatMoney(difference)}</p>
          </div>

          <div className="rounded-xl bg-sky-50 p-3">
            <p className="text-sm text-slate-500">Công thức</p>
            <p className="text-sm font-bold">Mặt + TK = Hiện có</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Ghi chú kiểm kê</label>
          <textarea
            value={form.note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="VD: Có thể chưa nhập tiền ăn sáng, quên ghi khoản chuyển khoản..."
            className="app-input mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="app-primary-button w-full rounded-xl px-5 py-2 font-medium sm:w-fit"
        >
          Lưu kiểm kê
        </button>
      </form>
    </section>
  );
}
