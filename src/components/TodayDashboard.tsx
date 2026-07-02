import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
} from "../types";
import { formatMoney } from "../utils/money";

type TodayDashboardProps = {
  todayString: string;
  todayChecklistDoneCount: number;
  todayGoalPaceRemaining: number;
  needPerDay: number;
  todayActualIncome: number;
  todayDailyIncomeRemaining: number;
  dailyIncomeGoal: number;
  todayWorkActualIncome: number;
  todayEntry?: DailyEntry;
  todayExpense?: ExpenseEntry;
  todayBalanceCheck?: BalanceCheckEntry;
  todayExpenseTotal: number;
  onEntryClick: () => void;
  onExpenseClick: () => void;
  onBalanceCheckClick: () => void;
};

export function TodayDashboard({
  todayString,
  todayChecklistDoneCount,
  todayGoalPaceRemaining,
  needPerDay,
  todayActualIncome,
  todayDailyIncomeRemaining,
  dailyIncomeGoal,
  todayWorkActualIncome,
  todayEntry,
  todayExpense,
  todayBalanceCheck,
  todayExpenseTotal,
  onEntryClick,
  onExpenseClick,
  onBalanceCheckClick,
}: TodayDashboardProps) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Hôm nay cần làm gì</h2>
          <p className="text-sm text-slate-500">
            Tóm tắt việc cần chốt trong ngày {todayString}.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
          {todayChecklistDoneCount}/3 mục đã xong
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div
          className={`rounded-xl p-4 ${
            todayGoalPaceRemaining > 0
              ? "bg-yellow-50 text-yellow-800"
              : "bg-green-50 text-green-700"
          }`}
        >
          <p className="text-sm opacity-80">Cần thêm để kịp mục tiêu lớn</p>
          <p className="mt-1 text-2xl font-black">
            {formatMoney(todayGoalPaceRemaining)}
          </p>
          <p className="mt-1 text-xs">
            Nhịp cần hôm nay: {formatMoney(needPerDay)} · Đã ròng:{" "}
            {formatMoney(todayActualIncome)}
          </p>
        </div>

        <div
          className={`rounded-xl p-4 ${
            todayDailyIncomeRemaining > 0
              ? "bg-slate-100 text-slate-900"
              : "bg-green-50 text-green-700"
          }`}
        >
          <p className="text-sm opacity-80">Còn thiếu mục tiêu ngày</p>
          <p className="mt-1 text-2xl font-black">
            {formatMoney(todayDailyIncomeRemaining)}
          </p>
          <p className="mt-1 text-xs">
            Mục tiêu ngày: {formatMoney(dailyIncomeGoal)}
          </p>
          <p className="mt-1 text-xs">
            Đã tính: {formatMoney(todayWorkActualIncome)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">Dữ liệu hôm nay</p>
          <p className="mt-1 text-2xl font-black">
            {todayChecklistDoneCount}/3
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Nhật ký, chi tiêu và kiểm kê số dư.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ChecklistCard
          title="Ca hub"
          done={Boolean(todayEntry)}
          description={
            todayEntry
              ? `Đã có thu nhập ${formatMoney(todayEntry.income)} trong nhật ký.`
              : "Thêm ca hub và nhật kí để tự tạo dữ liệu hôm nay."
          }
          actionLabel="Thêm ca hub và nhật kí"
          onClick={onEntryClick}
        />

        <ChecklistCard
          title="Chi tiêu"
          done={Boolean(todayExpense)}
          description={
            todayExpense
              ? `Đã chi ${formatMoney(todayExpenseTotal)}`
              : "Chưa ghi chi tiêu hôm nay."
          }
          actionLabel={todayExpense ? "Sửa chi tiêu" : "Nhập chi tiêu"}
          onClick={onExpenseClick}
        />

        <ChecklistCard
          title="Kiểm kê"
          done={Boolean(todayBalanceCheck)}
          description={
            todayBalanceCheck
              ? `Lệch ${formatMoney(todayBalanceCheck.difference)}`
              : "Chưa đối chiếu tiền mặt và tài khoản."
          }
          actionLabel={todayBalanceCheck ? "Xem kiểm kê" : "Kiểm kê ngay"}
          onClick={onBalanceCheckClick}
        />
      </div>
    </section>
  );
}

type ChecklistCardProps = {
  title: string;
  done: boolean;
  description: string;
  actionLabel: string;
  onClick: () => void;
};

function ChecklistCard({
  title,
  done,
  description,
  actionLabel,
  onClick,
}: ChecklistCardProps) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        done ? "border-green-200 bg-green-50" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold leading-5 ${
            done
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {done ? "Đã nhập" : "Còn thiếu"}
        </span>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="mt-3 inline-flex min-h-10 max-w-full items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium leading-tight text-white hover:bg-slate-700"
      >
        {actionLabel}
      </button>
    </article>
  );
}
