import { formatMoney } from "../../../utils/money.ts";
import type { JarSpendingAnalysis } from "../domain/jarSpendingAnalysis.ts";

type Category = JarSpendingAnalysis["categories"][number];
type ChartMode = "pie" | "column";

const colors = ["#37775a", "#87ad89", "#d2a258", "#8984b0", "#c77f73"];

function makePieGradient(categories: Category[], total: number) {
  let start = 0;
  return `conic-gradient(${categories.map((category, index) => {
    const end = start + category.amount / total * 100;
    const stop = `${colors[index]} ${start}% ${end}%`;
    start = end;
    return stop;
  }).join(", ")})`;
}

export function JarCategoryChart({ mode, categories, grossSpent }: {
  mode: ChartMode;
  categories: Category[];
  grossSpent: number;
}) {
  if (grossSpent <= 0) return null;

  const maxAmount = Math.max(...categories.map((category) => category.amount));
  return <div className="jar-category-chart">
    {mode === "pie" ? <div className="jar-category-donut" role="img"
      aria-label="Biểu đồ tròn tỷ trọng chi theo nhãn trước hoàn tiền"
      style={{ background: makePieGradient(categories, grossSpent) }}>
      <div><small>Tổng chi</small><strong>{formatMoney(grossSpent)}</strong></div>
    </div> : <div className="jar-category-columns" role="img"
      aria-label="Biểu đồ cột chi theo nhãn trước hoàn tiền"
      style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
      {categories.map((category, index) => <div className="jar-category-column" key={category.name}>
        <strong>{category.percentage}%</strong>
        <div className="jar-category-column-track"><span style={{
          height: `${Math.max(3, category.amount / maxAmount * 100)}%`,
          backgroundColor: colors[index],
        }} /></div>
        <small title={category.name}>{category.name}</small>
      </div>)}
    </div>}
    <div className="jar-category-legend" aria-label="Giá trị từng nhãn">
      {categories.map((category, index) => <div key={category.name}>
        <span className="jar-category-legend-name"><i style={{ backgroundColor: colors[index] }} />{category.name}</span>
        <strong>{formatMoney(category.amount)}</strong>
      </div>)}
    </div>
  </div>;
}
