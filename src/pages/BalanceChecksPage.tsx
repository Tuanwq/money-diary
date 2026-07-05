import type { Dispatch, SetStateAction } from "react";
import type { BalanceCheckEntry, GoalScreen, Page } from "../types";
import { getBalanceStatus, getBalanceStatusClass } from "../utils/balance";
import { formatMoney } from "../utils/money";

type BalanceChecksPageProps = {
  paginatedBalanceChecks: BalanceCheckEntry[];
  balanceCheckCurrentPage: number;
  balanceCheckTotalPages: number;
  setBalanceCheckCurrentPage: Dispatch<SetStateAction<number>>;
  editBalanceCheck: (item: BalanceCheckEntry) => void;
  deleteBalanceCheck: (id: string) => void;
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
};

export function BalanceChecksPage({
  paginatedBalanceChecks,
  balanceCheckCurrentPage,
  balanceCheckTotalPages,
  setBalanceCheckCurrentPage,
  editBalanceCheck,
  deleteBalanceCheck,
}: BalanceChecksPageProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử kiểm kê số dư</h2>
          <p className="text-sm text-slate-500">
            Theo dõi tiền mặt, tiền tài khoản và phần hao hụt/dư tiền mỗi ngày.
          </p>
        </div>

      </div>

      <section className="grid gap-4">
        {paginatedBalanceChecks.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-slate-500 shadow-sm">
            Chưa có bản ghi kiểm kê nào.
          </div>
        ) : (
          paginatedBalanceChecks.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{item.date}</h3>
                  <p className="text-sm text-slate-500">
                    {getBalanceStatus(item.difference)}:{" "}
                    {formatMoney(item.difference)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editBalanceCheck(item)}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Sửa
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteBalanceCheck(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <BalanceValue label="Tiền mặt" value={formatMoney(item.cash)} />
                <BalanceValue label="Tài khoản" value={formatMoney(item.bank)} />
                <BalanceValue
                  label="App tính"
                  value={formatMoney(item.appMoney)}
                />
                <BalanceValue
                  label="Thực tế"
                  value={formatMoney(item.actualMoney)}
                />

                <div
                  className={`rounded-xl p-3 ${getBalanceStatusClass(
                    item.difference
                  )}`}
                >
                  <p className="text-sm opacity-80">Chênh lệch</p>
                  <p className="font-bold">{formatMoney(item.difference)}</p>
                </div>
              </div>

              {item.note && (
                <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
                  {item.note}
                </p>
              )}
            </article>
          ))
        )}
      </section>

      {balanceCheckTotalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              setBalanceCheckCurrentPage((prev) => Math.max(prev - 1, 1))
            }
            disabled={balanceCheckCurrentPage === 1}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>

          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium">
            Trang {balanceCheckCurrentPage} / {balanceCheckTotalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setBalanceCheckCurrentPage((prev) =>
                Math.min(prev + 1, balanceCheckTotalPages)
              )
            }
            disabled={balanceCheckCurrentPage === balanceCheckTotalPages}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </>
  );
}

function BalanceValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
