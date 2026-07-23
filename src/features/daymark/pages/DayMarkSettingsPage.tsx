import { useState } from "react";
import { DayMarkNotificationSettingsCard } from "../../notifications/components/DayMarkNotificationSettingsCard";
import { useDayMarkStreakSettings } from "../hooks/useDayMarkStreakSettings";
import { clampStreakCompletionRate } from "../utils/daymarkStreak";

const streakRatePresets = [25, 50, 75, 100];

export function DayMarkSettingsPage({ userId }: { userId?: string }) {
  const { requiredCompletionRate, updateRequiredCompletionRate } =
    useDayMarkStreakSettings();
  const [customRate, setCustomRate] = useState(String(requiredCompletionRate));

  function applyCustomRate() {
    const nextRate = clampStreakCompletionRate(Number(customRate));

    updateRequiredCompletionRate(nextRate);
    setCustomRate(String(nextRate));
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h1 className="text-2xl font-bold">Cài đặt DayMark</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Thiết lập cách DayMark đánh giá tiến độ và chuỗi hoàn thành.
        </p>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Điều kiện duy trì streak</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Hoàn thành ít nhất {requiredCompletionRate}% nhiệm vụ trong ngày để duy trì chuỗi.
              </p>
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                Thay đổi ngưỡng sẽ tính lại toàn bộ lịch sử DayMark.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm dark:bg-slate-900">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Đang dùng
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {requiredCompletionRate}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {streakRatePresets.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    updateRequiredCompletionRate(rate);
                    setCustomRate(String(rate));
                  }}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    requiredCompletionRate === rate
                      ? "border-emerald-200 bg-emerald-700 text-white"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>

            <label className="grid min-w-0 gap-1 text-sm font-bold sm:w-48">
              <span>Tùy chỉnh</span>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customRate}
                  onChange={(event) => setCustomRate(event.target.value)}
                  className="app-input min-w-0 rounded-2xl border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={applyCustomRate}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Lưu
                </button>
              </div>
            </label>
          </div>
        </section>
      </section>
      <DayMarkNotificationSettingsCard userId={userId} />
    </div>
  );
}
