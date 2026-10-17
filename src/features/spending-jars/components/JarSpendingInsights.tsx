import { useState } from "react";
import type { JarSpendingAnalysis } from "../domain/jarSpendingAnalysis.ts";
import { formatMoney } from "../../../utils/money.ts";
import { JarCategoryChart } from "./JarCategoryChart.tsx";
import "./JarSpendingInsights.css";

function formatDay(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function JarSpendingInsights({ analysis }: {
  analysis: JarSpendingAnalysis;
}) {
  const [view, setView] = useState<"list" | "pie" | "column">("list");
  const visibleCategories = analysis.categories.slice(0, 4);
  const other = analysis.categories.slice(4).reduce((sum, item) => sum + item.amount, 0);
  const categories: JarSpendingAnalysis["categories"] = other > 0
    ? [...visibleCategories, { name: `${analysis.categories.length - 4} nhóm khác`, amount: other,
      percentage: analysis.grossSpent > 0 ? Math.round(other / analysis.grossSpent * 100) : 0 }]
    : visibleCategories;

  return <section className="jar-insights" aria-labelledby="jar-insights-title">
    <header className="jar-insights-heading">
      <div><h2 id="jar-insights-title">Bạn đã tiêu gì?</h2><p>{analysis.periodLabel} · chỉ tính giao dịch của hũ này</p></div>
      <strong>{formatMoney(analysis.netSpent)}</strong>
    </header>
    {analysis.expenseCount === 0 ? <p className="jar-insights-empty">Chưa có khoản chi trong kỳ này. Khi chi từ hũ, các nhóm và ghi chú sẽ hiện ở đây.</p> : <>
      <div className="jar-insights-metrics">
        <span><small>Số khoản chi</small><strong>{analysis.expenseCount}</strong></span>
        <span><small>Trung bình mỗi khoản</small><strong>{formatMoney(analysis.averageExpense)}</strong></span>
      </div>
      <div className="jar-insights-breakdown" aria-label="Chi theo nhãn">
        <div className="jar-insights-breakdown-heading"><h3>Chi theo nhãn</h3>
          <div className="jar-insights-view-toggle" role="group" aria-label="Kiểu hiển thị chi theo nhãn">
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>Danh sách</button>
            <button type="button" aria-pressed={view === "pie"} onClick={() => setView("pie")}>Tròn</button>
            <button type="button" aria-pressed={view === "column"} onClick={() => setView("column")}>Cột</button>
          </div>
        </div>
        {view === "list" ? categories.map((category) => <div className="jar-insights-category" key={category.name}>
          <div><span>{category.name}</span><strong>{formatMoney(category.amount)}</strong></div>
          <div className="jar-insights-bar" role="img" aria-label={`${category.name}: ${category.percentage}% tổng chi trước hoàn tiền`}>
            <span style={{ width: `${category.percentage}%` }} />
          </div>
        </div>) : <JarCategoryChart mode={view} categories={categories} grossSpent={analysis.grossSpent} />}
      </div>
      <div className="jar-insights-recent"><h3>Khoản chi gần đây</h3>
        {analysis.recent.map((event) => <div className="jar-insights-event" key={event.id}>
          <div><strong>{event.note || event.category}</strong><small>{event.note ? `${event.category} · ` : ""}{formatDay(event.date)} · {event.accountNames.join(" + ")}</small></div>
          <strong>−{formatMoney(event.amount)}</strong>
        </div>)}
      </div>
    </>}
    {analysis.refunded > 0 && <p className="jar-insights-refund">Đã chi {formatMoney(analysis.grossSpent)} · hoàn tiền {formatMoney(analysis.refunded)}. Phân nhóm giữ theo khoản chi gốc; tiền hoàn chưa được gán lại cho từng nhãn{analysis.refunded > analysis.grossSpent ? " và có thể thuộc kỳ trước" : ""}.</p>}
  </section>;
}
