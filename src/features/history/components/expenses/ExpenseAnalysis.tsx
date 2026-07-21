import { useState } from "react";
import type { OtherExpenseBreakdownItem } from "../../../../utils/entries";
import { formatMoney } from "../../../../utils/money";
import { getPercent, type ExpenseCategoryBreakdown } from "../../historySelectors";

type ExpenseAnalysisProps = {
  categories: ExpenseCategoryBreakdown[];
  labels: OtherExpenseBreakdownItem[];
  labelsTotal: number;
};

export function ExpenseAnalysis({ categories, labels, labelsTotal }: ExpenseAnalysisProps) {
  const [showAllLabels, setShowAllLabels] = useState(false);

  return (
    <section className="expense-analysis-grid" aria-label="Phân tích chi tiêu">
      <article className="history-analysis-section">
        <header><div><h2>Cơ cấu chi tiêu</h2><p>Tỷ trọng từng nhóm trong bộ lọc.</p></div></header>
        <div className="expense-category-list">
          {categories.map((item) => <ExpenseBreakdownRow key={item.label} {...item} />)}
        </div>
      </article>

      <article className="history-analysis-section">
        <header><div><h2>Phân tích theo nhãn</h2><p>Nhãn lớn nhất: {labels[0]?.label ?? "Chưa có dữ liệu"}</p></div><strong>{formatMoney(labelsTotal)}</strong></header>
        {labels.length === 0 ? (
          <p className="history-analysis-empty">Chưa có khoản khác trong bộ lọc này.</p>
        ) : (
          <>
            <div className="expense-label-table" role="table" aria-label="Phân tích chi tiêu theo nhãn">
              <div className="expense-label-table__header" role="row"><span role="columnheader">Nhãn</span><span role="columnheader">Số giao dịch</span><span role="columnheader">Số tiền</span><span role="columnheader">Tỷ trọng</span></div>
              {(showAllLabels ? labels : labels.slice(0, 3)).map((item) => {
                const percent = getPercent(item.total, labelsTotal);
                return (
                  <div key={item.label} className="expense-label-row" role="row">
                    <strong role="cell">{item.label}</strong><span role="cell">{item.count}</span><span role="cell">{formatMoney(item.total)}</span><span role="cell">{percent}%</span>
                    <i aria-hidden="true"><b style={{ width: `${percent}%` }} /></i>
                  </div>
                );
              })}
            </div>
            {labels.length > 3 && <button type="button" className="history-view-action" onClick={() => setShowAllLabels((value) => !value)}>{showAllLabels ? "Thu gọn nhãn" : "Xem tất cả nhãn"}</button>}
          </>
        )}
      </article>
    </section>
  );
}

function ExpenseBreakdownRow({ label, percent, total }: ExpenseCategoryBreakdown) {
  return <div className="expense-breakdown-row"><div><strong>{label}</strong><span>{formatMoney(total)} · {percent}%</span></div><i aria-hidden="true"><b style={{ width: `${percent}%` }} /></i></div>;
}
