import { useState, type FormEvent } from "react";
import { ArrowLeft, Plus, WalletCards } from "lucide-react";
import type { JarActivity, JarLedger, SpendingJar } from "../domain/jarModel.ts";
import { getAccountAvailableToAllocate, getAccountAllocation, getJarView } from "../domain/jarModel.ts";
import { smartAllocate, type JarCommand } from "../services/jarService.ts";
import { JarActivityList } from "../components/JarActivityList.tsx";
import { calculateAccountBalance } from "../../account-ledger/accountLedgerModel.ts";
import { getToday } from "../../../utils/date.ts";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import "./SpendingJarsPage.css";

type Action = "allocate" | "release" | "transfer" | "spend" | "refund";
type JarForm = { name: string; icon: string; color: string; limit: string;
  startDate: string; endDate: string; labels: string };

function fieldsFrom(jar?: SpendingJar): JarForm {
  return { name: jar?.name ?? "", icon: jar?.icon ?? "🫙", color: jar?.color ?? "",
    limit: jar ? formatMoneyInput(String(jar.limitAmount)) : "", startDate: jar?.startDate ?? getToday(),
    endDate: jar?.endDate ?? "", labels: jar?.linkedLabels.join(", ") ?? "" };
}

export function SpendingJarsPage({ ledger, cloudStatus, onBack, onCommand, onDeleteSpend, onRetrySync, onUseCloudVersion }: {
  ledger: JarLedger; cloudStatus: string; onBack: () => void; onCommand: (command: JarCommand) => void;
  onDeleteSpend: (activity: JarActivity) => Promise<void>; onRetrySync: () => void;
  onUseCloudVersion: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<"create" | "edit" | null>(null);
  const [jarForm, setJarForm] = useState<JarForm>(() => fieldsFrom());
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toJarId, setToJarId] = useState("");
  const [date, setDate] = useState(getToday());
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [purpose, setPurpose] = useState<"daily_expense" | "goal_allocation">("daily_expense");
  const [editingActivity, setEditingActivity] = useState<JarActivity | null>(null);
  const [error, setError] = useState("");
  const selected = ledger.jars.find((jar) => jar.id === selectedId && jar.status !== "deleted") ?? null;
  const views = ledger.jars.filter((jar) => jar.status !== "deleted").map((jar) => getJarView(ledger, jar));
  const active = views.filter((view) => view.jar.status === "active");
  const allocated = active.reduce((sum, view) => sum + view.remainingAmount + view.spentAmount, 0);
  const spent = active.reduce((sum, view) => sum + view.spentAmount, 0);
  const remaining = active.reduce((sum, view) => sum + view.remainingAmount, 0);
  const activeAccounts = ledger.accounts.filter((item) => !item.archivedAt);
  const accountNames = new Map(ledger.accounts.map((item) => [item.id, item.name]));

  function run(command: JarCommand) {
    try { onCommand(command); setError(""); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật hũ."); return false; }
  }
  function openAction(next: Action, activity?: JarActivity) {
    setAction(next);
    setEditingActivity(activity ?? null);
    setError("");
    const source = selected ? getJarView(ledger, selected).sources.find((item) => item.amount > 0) : null;
    setAccountId(next === "spend" && !activity ? "" : source?.accountId ?? activeAccounts[0]?.id ?? "");
    setAmount(""); setToJarId(""); setNote(activity?.note ?? ""); setDate(getToday());
    setPurpose("daily_expense");
    setCategory(selected?.linkedLabels[0] ?? "Khác");
    if (activity?.kind === "spend") {
      const transactions = (activity.transactionIds ?? []).flatMap((id) => {
        const item = ledger.transactions.find((transaction) => transaction.id === id);
        return item ? [item] : [];
      });
      setAmount(formatMoneyInput(String(transactions.reduce((sum, item) => sum + item.amount, 0))));
      setAccountId(transactions.length === 1 ? transactions[0].accountId : "");
      setDate(transactions[0]?.date ?? getToday());
      setCategory(transactions[0]?.category ?? selected?.linkedLabels[0] ?? "Khác");
      setPurpose(transactions[0]?.purpose === "goal_allocation" ? "goal_allocation" : "daily_expense");
    }
  }
  function submitJar(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const fields = { name: jarForm.name, icon: jarForm.icon, color: jarForm.color || undefined,
      limitAmount: parseMoneyInput(jarForm.limit), startDate: jarForm.startDate,
      endDate: jarForm.endDate || undefined, linkedLabels: jarForm.labels.split(",") };
    const command: JarCommand = editor === "edit" && selected
      ? { kind: "edit", id: crypto.randomUUID(), jarId: selected.id, now, fields }
      : { kind: "create", id: crypto.randomUUID(), now, fields };
    if (run(command)) setEditor(null);
  }
  function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!selected || !action) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const value = parseMoneyInput(amount);
    const command: JarCommand = action === "transfer"
      ? { kind: "transfer", id, now, jarId: selected.id, toJarId, accountId, amount: value }
      : action === "spend"
        ? { kind: "spend", id, now, jarId: selected.id, amount: value, accountId: accountId || undefined,
          date, category, note, purpose, activityId: editingActivity?.id }
        : action === "refund"
          ? { kind: "refund", id, now, jarId: selected.id, accountId, amount: value, date, note }
          : { kind: action, id, now, jarId: selected.id, accountId, amount: value, note };
    if (run(command)) { setAction(null); setEditingActivity(null); }
  }

  return <div className="spending-jars-page">
    <header className="jars-header"><button onClick={() => selected ? setSelectedId(null) : onBack()} type="button" aria-label="Quay lại"><ArrowLeft size={20} /></button>
      <div><span>Money Diary</span><h1>{selected ? `${selected.icon} ${selected.name}` : "Hũ chi tiêu"}</h1></div>
      {!selected && <button className="jars-primary" onClick={() => { setJarForm(fieldsFrom()); setEditor("create"); setError(""); }} type="button"><Plus size={17} /> Tạo hũ</button>}
    </header>
    {/migration|chưa thể|lỗi|xung đột/i.test(cloudStatus) && <div className="jars-warning" role="status">
      <p>{cloudStatus}. Dữ liệu trên thiết bị chưa được đồng bộ.</p>
      <button type="button" onClick={onRetrySync}>Thử đồng bộ lại</button>
      {/xung đột/i.test(cloudStatus) && <button type="button" onClick={() => {
        try { onUseCloudVersion(); setError(""); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa thể tải bản cloud."); }
      }}>Dùng bản cloud (giữ bản sao trên máy)</button>}
    </div>}
    {error && <p className="jars-error" role="alert">{error}</p>}
    {!selected ? <>
      <section className="jars-summary" aria-label="Tổng quan các hũ">
        <div><span>Tổng đã phân bổ</span><strong>{formatMoney(allocated)}</strong></div>
        <div><span>Đã tiêu</span><strong>{formatMoney(spent)}</strong></div>
        <div><span>Còn khả dụng</span><strong>{formatMoney(remaining)}</strong></div>
      </section>
      {active.length === 0 && <p className="jars-empty">Chưa có hũ nào. Tạo hũ đầu tiên hoặc đợi ngân sách theo nhãn được chuyển vào đây.</p>}
      <div className="jars-grid">{active.map((view) => <button className="jar-card" key={view.jar.id} onClick={() => setSelectedId(view.jar.id)} type="button">
        <span className="jar-card-title"><span>{view.jar.icon} {view.jar.name}</span><strong>{formatMoney(view.remainingAmount)}</strong></span>
        <small>Đã chi {formatMoney(view.spentAmount)} · Hạn mức {formatMoney(view.jar.limitAmount)}</small>
        <i className="jar-progress"><b style={{ width: `${Math.min(100, Math.max(0, (view.spentAmount / view.jar.limitAmount) * 100))}%` }} /></i>
        <span className="jar-card-sources">{view.sources.filter((item) => item.amount > 0).map((item) =>
          `${accountNames.get(item.accountId) ?? "Tài khoản đã xóa"}: ${formatMoney(item.amount)}`).join(" · ") || "Chưa phân bổ tiền"}</span>
        {view.deficitAmount > 0 && <span className="jars-warning">Nguồn đang thiếu {formatMoney(view.deficitAmount)}</span>}
      </button>)}</div>
      {views.some((view) => view.jar.status === "closed") && <details className="jars-closed"><summary>Hũ đã đóng</summary>
        {views.filter((view) => view.jar.status === "closed").map((view) => <button key={view.jar.id} onClick={() => setSelectedId(view.jar.id)} type="button">{view.jar.icon} {view.jar.name}</button>)}
      </details>}
      <section className="jars-accounts"><h2>Tiền có thể phân bổ theo tài khoản</h2>{activeAccounts.map((account) => <div key={account.id}>
        <span>{account.name}<small>Số dư {formatMoney(calculateAccountBalance(account, ledger.transactions))} · Đã dành {formatMoney(getAccountAllocation(ledger, account.id))}</small></span>
        <strong>{formatMoney(getAccountAvailableToAllocate(ledger, account.id))}</strong>
        {getAccountAllocation(ledger, account.id) > calculateAccountBalance(account, ledger.transactions) &&
          <small className="jars-warning">Tổng tiền đã dành vượt số dư thực tế. Hãy bổ sung tiền hoặc giải phóng phân bổ.</small>}
      </div>)}</section>
    </> : (() => {
      const view = getJarView(ledger, selected);
      return <>
        <section className="jar-detail-hero" aria-label="Tổng quan hũ">
          <div className="jar-detail-hero-top"><span>{selected.status === "closed" ? "Hũ đã đóng" : "Còn trong hũ"}</span>
            <strong>{formatMoney(view.remainingAmount)}</strong></div>
          <div className="jar-detail-progress-label"><span>Đã tiêu {formatMoney(view.spentAmount)}</span><span>Hạn mức {formatMoney(selected.limitAmount)}</span></div>
          <i className="jar-progress"><b style={{ width: `${Math.min(100, Math.max(0, (view.spentAmount / selected.limitAmount) * 100))}%` }} /></i>
          <p>Nhãn liên kết: {selected.linkedLabels.join(", ") || "Chưa liên kết"}</p>
        </section>
        {view.deficitAmount > 0 && <p className="jars-warning">Tài khoản nguồn hiện thấp hơn phần đã dành {formatMoney(view.deficitAmount)}. Hãy nạp thêm hoặc giải phóng tiền.</p>}
        <section className="jar-sources"><h2>Nguồn tiền hiện tại</h2>{view.sources.filter((item) => item.amount > 0).map((item) => <div key={item.accountId}>
          <span><WalletCards size={16} /> {accountNames.get(item.accountId) ?? "Tài khoản đã xóa"}</span><strong>{formatMoney(item.amount)}</strong>
        </div>)}{view.remainingAmount === 0 && <p>Hũ chưa có tiền khả dụng.</p>}</section>
        {selected.status === "active" && <section className="jar-action-section" aria-label="Thao tác với hũ">
          <h2>Quản lý tiền trong hũ</h2>
          <div className="jar-actions">
            <button className="jars-primary jar-action-main" onClick={() => openAction("spend")} type="button">Chi tiền từ hũ</button>
            <button onClick={() => openAction("allocate")} type="button">Nạp tiền</button>
            <button onClick={() => openAction("release")} type="button">Giải phóng</button>
            <button onClick={() => openAction("transfer")} type="button">Chuyển sang hũ</button>
            <button onClick={() => openAction("refund")} type="button">Hoàn tiền</button>
            <button onClick={() => {
            const proposal = smartAllocate(ledger, selected.id);
            if (!proposal.length) { setError("Chưa có tiền khả dụng hoặc hũ đã đủ hạn mức."); return; }
            run({ kind: "smart_allocate", jarId: selected.id, id: crypto.randomUUID(), now: new Date().toISOString() });
            }} type="button">Chia thông minh</button>
          </div>
          <details className="jar-management"><summary>Điều chỉnh hoặc đóng hũ</summary><div>
            <button onClick={() => { setJarForm(fieldsFrom(selected)); setEditor("edit"); }} type="button">Điều chỉnh hũ</button>
            <button onClick={() => { if (window.confirm("Đóng hũ và giải phóng toàn bộ tiền chưa tiêu?")) run({ kind: "close", jarId: selected.id, id: crypto.randomUUID(), now: new Date().toISOString() }); }} type="button">Đóng hũ</button>
            <button onClick={() => { if (window.confirm("Xóa hũ chưa có lịch sử?")) { if (run({ kind: "delete", jarId: selected.id, id: crypto.randomUUID(), now: new Date().toISOString() })) setSelectedId(null); } }} type="button">Xóa hũ</button>
          </div></details>
        </section>}
        <JarActivityList ledger={ledger} jarId={selected.id} onEditSpend={(item) => openAction("spend", item)}
          onDeleteSpend={(item) => {
            if (!window.confirm("Xóa toàn bộ khoản chi này từ các tài khoản nguồn?")) return;
            void onDeleteSpend(item).catch((cause) =>
              setError(cause instanceof Error ? cause.message : "Không thể xóa khoản chi."));
          }} />
      </>;
    })()}

    {editor && <div className="jars-modal-backdrop"><form className="jars-modal" onSubmit={submitJar}>
      <h2>{editor === "edit" ? "Điều chỉnh hũ" : "Tạo hũ mới"}</h2>
      <label>Tên hũ<input maxLength={60} required value={jarForm.name} onChange={(event) => setJarForm({ ...jarForm, name: event.target.value })} placeholder="Ví dụ: Ăn uống" /></label>
      <div className="jars-form-row"><label>Biểu tượng<input value={jarForm.icon} onChange={(event) => setJarForm({ ...jarForm, icon: event.target.value })} /></label>
        <label>Màu<input type="color" value={jarForm.color || "#477962"} onChange={(event) => setJarForm({ ...jarForm, color: event.target.value })} /></label></div>
      <label>Hạn mức<input inputMode="numeric" required value={jarForm.limit} onChange={(event) => setJarForm({ ...jarForm, limit: formatMoneyInput(event.target.value) })} /></label>
      <div className="jars-form-row"><label>Bắt đầu<input type="date" required value={jarForm.startDate} onChange={(event) => setJarForm({ ...jarForm, startDate: event.target.value })} /></label>
        <label>Kết thúc (nếu có)<input type="date" value={jarForm.endDate} onChange={(event) => setJarForm({ ...jarForm, endDate: event.target.value })} /></label></div>
      <label>Nhãn liên kết, cách nhau bằng dấu phẩy<input value={jarForm.labels} onChange={(event) => setJarForm({ ...jarForm, labels: event.target.value })} placeholder="Ăn uống, Siêu thị" /></label>
      <div className="jars-form-actions"><button type="button" onClick={() => setEditor(null)}>Hủy</button><button className="jars-primary" type="submit">Lưu hũ</button></div>
    </form></div>}

    {action && selected && <div className="jars-modal-backdrop"><form className="jars-modal" onSubmit={submitAction}>
      <h2>{({ allocate: "Nạp tiền vào hũ", release: "Giải phóng tiền", transfer: "Chuyển giữa các hũ", spend: "Chi tiền từ hũ", refund: "Hoàn tiền vào hũ" })[action]}</h2>
      <p>Hũ {selected.name} · còn {formatMoney(getJarView(ledger, selected).remainingAmount)}</p>
      <label>Số tiền<input inputMode="numeric" required value={amount} onChange={(event) => setAmount(formatMoneyInput(event.target.value))} placeholder="300.000" /></label>
      <label>{action === "spend" ? "Nguồn thanh toán" : "Tài khoản nguồn"}<select required={action !== "spend"} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
        {action === "spend" && <option value="">Tự động chia theo nguồn</option>}
        {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {action === "allocate"
          ? `có thể dành ${formatMoney(getAccountAvailableToAllocate(ledger, account.id))}`
          : `trong hũ ${formatMoney(getJarView(ledger, selected).sources.find((item) => item.accountId === account.id)?.amount ?? 0)}`}</option>)}
      </select></label>
      {action === "transfer" && <label>Hũ nhận<select required value={toJarId} onChange={(event) => setToJarId(event.target.value)}><option value="">Chọn hũ</option>
        {active.filter((view) => view.jar.id !== selected.id).map((view) => <option key={view.jar.id} value={view.jar.id}>{view.jar.name}</option>)}
      </select></label>}
      {(action === "spend" || action === "refund") && <label>Ngày<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>}
      {action === "spend" && <><label>Nhãn khoản chi<input list="jar-linked-labels" required value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <datalist id="jar-linked-labels">{selected.linkedLabels.map((label) => <option value={label} key={label} />)}</datalist>
        <label>Ảnh hưởng mục tiêu<select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)}>
          <option value="daily_expense">Chi thường ngày · trừ tiến độ</option><option value="goal_allocation">Phân bổ mục tiêu · không trừ tiến độ</option>
        </select></label></>}
      <label>Ghi chú<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nội dung" /></label>
      <div className="jars-form-actions"><button onClick={() => { setAction(null); setEditingActivity(null); }} type="button">Hủy</button>
        <button className="jars-primary" type="submit">{editingActivity ? "Lưu sửa" : "Xác nhận"}</button></div>
    </form></div>}
  </div>;
}
