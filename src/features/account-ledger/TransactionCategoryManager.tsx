import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { showAppToast } from "../../components/feedback/appToast.ts";
import type { AccountTransaction, TransactionCategory } from "./accountLedgerModel.ts";
import { categoriesForType, type CategoryCommand } from "./transactionCategories.ts";
import "./transactionCategories.css";

export function TransactionCategoryManager({ categories, transactions, onCommand, onClose }: {
  categories: TransactionCategory[];
  transactions: AccountTransaction[];
  onCommand: (command: CategoryCommand) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#407b5a");
  const [icon, setIcon] = useState("");
  const [shared, setShared] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const visible = categoriesForType(categories, type);
  const removing = categories.find((item) => item.id === removingId);
  const affected = transactions.filter((item) => item.categoryId === removingId).length;

  function save() {
    try {
      if (editingId) onCommand({ kind: "edit", id: editingId, name, color, icon });
      else onCommand({ kind: "add", id: crypto.randomUUID(), name, type: shared ? "both" : type, color, icon });
      setName(""); setIcon(""); setEditingId(null);
    } catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Không lưu được nhãn."); }
  }
  function remove() {
    if (!removingId) return;
    try {
      onCommand({ kind: "delete", id: removingId, replacementId: replacementId || undefined,
        now: new Date().toISOString() });
      setRemovingId(null); setReplacementId("");
    } catch (cause) { showAppToast(cause instanceof Error ? cause.message : "Không xóa được nhãn."); }
  }
  return createPortal(<div className="ledger-modal-backdrop category-manager-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section aria-label="Quản lý nhãn giao dịch" aria-modal="true" className="ledger-modal category-manager" role="dialog">
      <header className="ledger-modal-header"><div><span>Sổ giao dịch</span><h2>Quản lý nhãn</h2></div>
        <button aria-label="Đóng quản lý nhãn" className="ledger-icon-button" onClick={onClose} type="button"><X size={20} /></button></header>
      <div className="category-manager__tabs" role="group" aria-label="Loại nhãn">
        <button aria-pressed={type === "income"} onClick={() => { setType("income"); setEditingId(null); setName(""); setIcon(""); }} type="button">Thu tiền</button>
        <button aria-pressed={type === "expense"} onClick={() => { setType("expense"); setEditingId(null); setName(""); setIcon(""); }} type="button">Chi tiền</button>
      </div>
      <div className="category-manager__list">
        {visible.length === 0 && <p>Chưa có nhãn. Tạo nhãn đầu tiên bên dưới.</p>}
        {visible.map((item) => <div className="category-manager__item" key={item.id}>
          <span className="category-manager__swatch" style={{ background: item.color || "#407b5a" }} />
          <strong>{item.icon ? `${item.icon} ` : ""}{item.name}</strong>
          <button onClick={() => { setEditingId(item.id); setName(item.name); setColor(item.color || "#407b5a");
            setIcon(item.icon || ""); }} type="button">Sửa</button>
          <button onClick={() => { setRemovingId(item.id); setReplacementId(""); }} type="button">Xóa</button>
        </div>)}
      </div>
      <div className="category-manager__editor">
        <label>Tên nhãn<input maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Đi lại" value={name} /></label>
        <label>Màu<input aria-label="Màu nhãn" onChange={(event) => setColor(event.target.value)} type="color" value={color} /></label>
        <label className="category-manager__icon">Biểu tượng (tùy chọn)
          <input maxLength={4} onChange={(event) => setIcon(event.target.value)} placeholder="Ví dụ: 🍜" value={icon} /></label>
        {!editingId && <label className="category-manager__shared"><input checked={shared} onChange={(event) => setShared(event.target.checked)} type="checkbox" />Dùng chung cho thu và chi</label>}
        <button className="notification-primary-button" onClick={save} type="button">{editingId ? "Lưu nhãn" : "Thêm nhãn"}</button>
      </div>
      {removing && <div className="category-manager__confirm" role="alertdialog" aria-label="Xác nhận xóa nhãn">
        <strong>Xóa nhãn “{removing.name}”?</strong>
        <p>{affected > 0 ? `${affected} giao dịch đang dùng nhãn này. Giao dịch vẫn được giữ.` : "Không có giao dịch liên kết."}</p>
        {affected > 0 && <label>Chuyển giao dịch sang
          <select onChange={(event) => setReplacementId(event.target.value)} value={replacementId}>
            <option value="">Bỏ gán nhãn</option>
            {visible.filter((item) => item.id !== removing.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>}
        <div><button onClick={() => setRemovingId(null)} type="button">Hủy</button>
          <button className="notification-primary-button" onClick={remove} type="button">Xác nhận xóa</button></div>
      </div>}
    </section>
  </div>, document.body);
}
