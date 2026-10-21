import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PopupNotice } from "../../../components/feedback/PopupNotice.tsx";
import { ArrowLeft, Ellipsis, Plus, X } from "lucide-react";
import type { JarActivity, JarLedger, SpendingJar } from "../domain/jarModel.ts";
import { getAccountAvailableToAllocate, getJarView } from "../domain/jarModel.ts";
import { getJarDetailPresentation } from "../domain/jarPresentation.ts";
import { getJarSpendingAnalysis } from "../domain/jarSpendingAnalysis.ts";
import { smartAllocate, type JarCommand } from "../services/jarService.ts";
import { JarActivityList } from "../components/JarActivityList.tsx";
import { SpendingJarsOverview } from "../components/SpendingJarsOverview.tsx";
import { JarDetailOverview } from "../components/JarDetailOverview.tsx";
import { JarSpendingInsights } from "../components/JarSpendingInsights.tsx";
import { getToday } from "../../../utils/date.ts";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import "./SpendingJarsPage.css";

type Action = "allocate" | "release" | "transfer" | "spend" | "refund";
type JarForm = { name: string; icon: string; color: string; limit: string;
  startDate: string; endDate: string; labels: string; budgetPeriod: "monthly" | "custom" | "legacy_total" };

function fieldsFrom(jar?: SpendingJar): JarForm {
  return { name: jar?.name ?? "", icon: jar?.icon ?? "🫙", color: jar?.color ?? "",
    limit: jar ? formatMoneyInput(String(jar.limitAmount)) : "", startDate: jar?.startDate ?? getToday(),
    endDate: jar?.endDate ?? "", labels: jar?.linkedLabels.join(", ") ?? "",
    budgetPeriod: jar?.budgetPeriod ?? (jar ? "legacy_total" : "monthly") };
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
  const [picker, setPicker] = useState<"allocate" | "smart" | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "history">("overview");
  const modalRef = useRef<HTMLFormElement | HTMLDivElement>(null);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toJarId, setToJarId] = useState("");
  const [date, setDate] = useState(getToday());
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [purpose, setPurpose] = useState<"daily_expense" | "goal_allocation">("goal_allocation");
  const [editingActivity, setEditingActivity] = useState<JarActivity | null>(null);
  const [error, setError] = useState("");
  const stableLedger = useMemo(() => ({ accounts: ledger.accounts, transactions: ledger.transactions,
    jars: ledger.jars, jarActivities: ledger.jarActivities }),
    [ledger.accounts, ledger.transactions, ledger.jars, ledger.jarActivities]);
  const selected = ledger.jars.find((jar) => jar.id === selectedId && jar.status !== "deleted") ?? null;
  const views = useMemo(() => stableLedger.jars.filter((jar) => jar.status !== "deleted")
    .map((jar) => getJarView(stableLedger, jar)), [stableLedger]);
  const active = views.filter((view) => view.jar.status === "active");
  const closed = views.filter((view) => view.jar.status === "closed");
  const activeAccounts = ledger.accounts.filter((item) => !item.archivedAt);
  const allocationAccounts = activeAccounts.filter((item) => getAccountAvailableToAllocate(ledger, item.id) > 0);
  const isLoadingEmptyLedger = ledger.jars.length === 0 && /đang tải/i.test(cloudStatus);
  const accountNames = new Map(ledger.accounts.map((item) => [item.id, item.name]));
  const spendingAnalysis = useMemo(() => {
    const jar = stableLedger.jars.find((item) => item.id === selectedId && item.status !== "deleted");
    return jar ? getJarSpendingAnalysis(stableLedger, jar, getToday()) : null;
  }, [selectedId, stableLedger]);

  function openCreate() {
    setJarForm(fieldsFrom());
    setEditor("create");
    setError("");
  }

  function openJar(id: string) { setSelectedId(id); setDetailTab("overview"); setError(""); }

  function run(command: JarCommand) {
    try { onCommand(command); setError(""); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật hũ."); return false; }
  }
  function openAction(next: Action, activity?: JarActivity, targetJar?: SpendingJar) {
    const target = targetJar ?? selected;
    if (!target) return;
    if (targetJar) openJar(targetJar.id);
    setAction(next);
    setEditingActivity(activity ?? null);
    setError("");
    const source = getJarView(ledger, target).sources.find((item) => item.amount > 0);
    setAccountId(next === "spend" && !activity ? ""
      : next === "allocate" ? allocationAccounts[0]?.id ?? ""
        : source?.accountId ?? activeAccounts[0]?.id ?? "");
    setAmount(""); setToJarId(""); setNote(activity?.note ?? ""); setDate(getToday());
    setPurpose("goal_allocation");
    setCategory(target.linkedLabels[0] ?? "Khác");
    if (activity?.kind === "spend") {
      const transactions = (activity.transactionIds ?? []).flatMap((id) => {
        const item = ledger.transactions.find((transaction) => transaction.id === id);
        return item ? [item] : [];
      });
      setAmount(formatMoneyInput(String(transactions.reduce((sum, item) => sum + item.amount, 0))));
      setAccountId(transactions.length === 1 ? transactions[0].accountId : "");
      setDate(transactions[0]?.date ?? getToday());
      setCategory(transactions[0]?.category ?? target.linkedLabels[0] ?? "Khác");
      setPurpose(transactions[0]?.purpose === "goal_allocation" ? "goal_allocation" : "daily_expense");
    }
  }
  function submitJar(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const fields = { name: jarForm.name, icon: jarForm.icon, color: jarForm.color || undefined,
      limitAmount: parseMoneyInput(jarForm.limit), startDate: jarForm.startDate,
      endDate: jarForm.endDate || undefined, linkedLabels: jarForm.labels.split(","),
      budgetPeriod: jarForm.budgetPeriod };
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
          ? { kind: "refund", id, now, jarId: selected.id, accountId, amount: value, date, note, purpose }
          : { kind: action, id, now, jarId: selected.id, accountId, amount: value, note };
    if (run(command)) { setAction(null); setEditingActivity(null); }
  }

  function chooseJarFor(mode: "allocate" | "smart") {
    if (active.length === 1) { selectTarget(active[0].jar, mode); return; }
    setPicker(mode);
  }
  function selectTarget(jar: SpendingJar, mode: "allocate" | "smart") {
    setPicker(null);
    if (mode === "allocate") openAction("allocate", undefined, jar);
    else {
      const proposal = smartAllocate(ledger, jar.id);
      if (!proposal.length) { setError("Chưa có tiền chưa phân bổ hoặc hũ đã đủ hạn mức."); return; }
      if (run({ kind: "smart_allocate", jarId: jar.id, id: crypto.randomUUID(), now: new Date().toISOString() }))
        openJar(jar.id);
    }
  }
  useEffect(() => {
    if (!editor && !action && !picker) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => modalRef.current?.querySelector<HTMLElement>(
      action ? ".jars-amount-label input" : editor ? "input" : ".jars-picker-option")?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setEditor(null); setAction(null); setPicker(null); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(modalRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)" ) ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLElement>(".jar-quick-actions button, .jars-summary-actions button, .jars-create-button")?.focus();
    };
  }, [editor, action, picker]);

  return <div className="spending-jars-page">
    <header className="jars-header"><button className="jars-back" onClick={() => selected ? setSelectedId(null) : onBack()} type="button" aria-label="Quay lại"><ArrowLeft size={20} /></button>
      <div className="jars-header-copy"><span>Money Diary</span><h1>{selected ? <><span className="jars-header-icon" aria-hidden="true">{selected.icon}</span>{selected.name}</> : "Hũ chi tiêu"}</h1>{!selected && <p>Tiền đã dành cho từng mục đích.</p>}{selected && <p className="jars-header-status">{selected.status === "closed" ? "Đã đóng" : "Đang dùng"}</p>}</div>
      {!selected ? <button className="jars-primary jars-create-button" onClick={openCreate} type="button" aria-label="Tạo hũ mới"><Plus size={19} /><span>Tạo hũ</span></button>
        : selected.status === "active" && <details className="jar-header-menu"><summary aria-label="Thao tác với hũ"><Ellipsis size={21} /></summary><div>
          <button onClick={() => { setJarForm(fieldsFrom(selected)); setEditor("edit"); }} type="button">Sửa hũ</button>
          <button onClick={() => { if (window.confirm("Đóng hũ, giải phóng tiền chưa tiêu và gỡ toàn bộ nhãn liên kết?")) run({ kind: "close", jarId: selected.id, id: crypto.randomUUID(), now: new Date().toISOString() }); }} type="button">Đóng hũ</button>
          <button onClick={() => { if (window.confirm("Xóa hũ chưa có lịch sử?")) { if (run({ kind: "delete", jarId: selected.id, id: crypto.randomUUID(), now: new Date().toISOString() })) setSelectedId(null); } }} type="button">Xóa hũ</button>
        </div></details>}
    </header>
    <PopupNotice message={/migration|chưa thể|lỗi|xung đột/i.test(cloudStatus)
      ? `${cloudStatus}. Dữ liệu trên thiết bị chưa được đồng bộ.` : ""}
      actionLabel="Thử đồng bộ lại" onAction={onRetrySync}
      secondaryActionLabel={/xung đột/i.test(cloudStatus) ? "Dùng bản cloud" : undefined}
      onSecondaryAction={() => {
        try { onUseCloudVersion(); setError(""); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa thể tải bản cloud."); }
      }} />
    <PopupNotice message={error} />
    {isLoadingEmptyLedger && <p className="jars-loading" role="status">Đang tải dữ liệu hũ chi tiêu…</p>}
    {!selected && !isLoadingEmptyLedger ? <SpendingJarsOverview active={active} closed={closed} ledger={ledger}
      onCreate={openCreate} onOpen={openJar} onAllocate={() => chooseJarFor("allocate")}
      onSmartAllocate={() => chooseJarFor("smart")} /> : selected && (() => {
      const item = getJarDetailPresentation(stableLedger, selected, getToday());
      return <>
        {selected.status === "active" && <div className="jar-quick-actions" aria-label="Thao tác chính">
          <button className="jars-primary" onClick={() => openAction("spend")} type="button">Chi từ hũ</button>
          <button onClick={() => openAction("allocate")} type="button">Nạp tiền</button>
          <button onClick={() => openAction("transfer")} type="button">Chuyển</button>
        </div>}
        <div className="jar-detail-tabs" role="group" aria-label="Chi tiết hũ">
          <button aria-pressed={detailTab === "overview"} className={detailTab === "overview" ? "is-active" : ""}
            onClick={() => setDetailTab("overview")} type="button">Tổng quan</button>
          <button aria-pressed={detailTab === "history"} className={detailTab === "history" ? "is-active" : ""}
            onClick={() => setDetailTab("history")} type="button">Lịch sử</button>
        </div>
        {detailTab === "overview" ? <>
          <JarDetailOverview item={item} accountNames={accountNames} />
          {spendingAnalysis && <details className="jar-insights-panel"><summary>Xem phân tích chi tiêu</summary>
            <JarSpendingInsights analysis={spendingAnalysis} /></details>}
          {selected.status === "active" && <details className="jar-secondary-actions"><summary>Thao tác khác</summary><div>
            <button onClick={() => openAction("release")} type="button">Giải phóng về tài khoản</button>
            <button onClick={() => openAction("refund")} type="button">Hoàn tiền</button>
            <button onClick={() => selectTarget(selected, "smart")} type="button">Chia thông minh</button>
          </div></details>}
        </> : <JarActivityList ledger={ledger} jarId={selected.id} onEditSpend={(activity) => openAction("spend", activity)}
          onDeleteSpend={(activity) => {
            if (!window.confirm("Xóa toàn bộ khoản chi này từ các tài khoản nguồn?")) return;
            void onDeleteSpend(activity).catch((cause) =>
              setError(cause instanceof Error ? cause.message : "Không thể xóa khoản chi."));
          }} />}
      </>;
    })()}

    {picker && <div className="jars-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPicker(null); }}>
      <div className="jars-modal jars-picker" role="dialog" aria-modal="true" aria-labelledby="jars-picker-title" ref={(node) => { modalRef.current = node; }}>
        <header className="jars-modal-heading"><h2 id="jars-picker-title">Chọn hũ để {picker === "smart" ? "chia thông minh" : "chia tiền"}</h2>
          <button type="button" aria-label="Đóng" onClick={() => setPicker(null)}><X size={19} /></button></header>
        {active.map(({ jar }) => <button className="jars-picker-option" type="button" key={jar.id}
          onClick={() => selectTarget(jar, picker)}><span aria-hidden="true">{jar.icon}</span>{jar.name}</button>)}
      </div></div>}

    {editor && <div className="jars-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}>
      <form className="jars-modal" role="dialog" aria-modal="true" aria-labelledby="jars-editor-title" ref={(node) => { modalRef.current = node; }} onSubmit={submitJar}>
      <header className="jars-modal-heading"><h2 id="jars-editor-title">{editor === "edit" ? "Sửa hũ" : "Tạo hũ mới"}</h2>
        <button type="button" aria-label="Đóng" onClick={() => setEditor(null)}><X size={19} /></button></header>
      <label>Tên hũ<input maxLength={60} required value={jarForm.name} onChange={(event) => setJarForm({ ...jarForm, name: event.target.value })} placeholder="Ví dụ: Ăn uống" /></label>
      <div className="jars-form-row"><label>Biểu tượng<input value={jarForm.icon} onChange={(event) => setJarForm({ ...jarForm, icon: event.target.value })} /></label>
        <label>Màu<input type="color" value={jarForm.color || "#477962"} onChange={(event) => setJarForm({ ...jarForm, color: event.target.value })} /></label></div>
      <label>Hạn mức<input inputMode="numeric" required value={jarForm.limit} onChange={(event) => setJarForm({ ...jarForm, limit: formatMoneyInput(event.target.value) })} /></label>
      <label>Kỳ ngân sách<select value={jarForm.budgetPeriod} onChange={(event) => setJarForm({ ...jarForm, budgetPeriod: event.target.value as JarForm["budgetPeriod"] })}>
        <option value="monthly">Hàng tháng</option><option value="custom">Từ ngày bắt đầu đến kết thúc</option>
        {editor === "edit" && jarForm.budgetPeriod === "legacy_total" && <option value="legacy_total">Hũ cũ · toàn kỳ (cần xem lại)</option>}
      </select></label>
      <div className="jars-form-row"><label>Bắt đầu<input type="date" required value={jarForm.startDate} onChange={(event) => setJarForm({ ...jarForm, startDate: event.target.value })} /></label>
        <label>Kết thúc (nếu có)<input type="date" value={jarForm.endDate} onChange={(event) => setJarForm({ ...jarForm, endDate: event.target.value })} /></label></div>
      <label>Nhãn liên kết, cách nhau bằng dấu phẩy<input value={jarForm.labels} onChange={(event) => setJarForm({ ...jarForm, labels: event.target.value })} placeholder="Ăn uống, Siêu thị" /></label>
      {error && <p className="jars-error" role="alert">{error}</p>}
      <div className="jars-form-actions"><button type="button" onClick={() => setEditor(null)}>Hủy</button><button className="jars-primary" type="submit">Lưu hũ</button></div>
    </form></div>}

    {action && selected && <div className="jars-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAction(null); }}>
      <form className="jars-modal jars-action-modal" role="dialog" aria-modal="true" aria-labelledby="jars-action-title" ref={(node) => { modalRef.current = node; }} onSubmit={submitAction}>
      <header className="jars-modal-heading"><h2 id="jars-action-title">{({ allocate: "Nạp tiền vào hũ", release: "Giải phóng về tài khoản", transfer: "Chuyển sang hũ khác", spend: "Chi từ hũ", refund: "Hoàn tiền vào hũ" })[action]}</h2>
        <button type="button" aria-label="Đóng" onClick={() => setAction(null)}><X size={19} /></button></header>
      <p>Hũ {selected.name} · tiền thực {formatMoney(Math.max(0, getJarView(ledger, selected).remainingAmount))}</p>
      <label className="jars-amount-label">Số tiền<input inputMode="numeric" required value={amount} onChange={(event) => setAmount(formatMoneyInput(event.target.value))} placeholder="300.000" /></label>
      <label>{action === "spend" ? "Nguồn thanh toán" : action === "release" ? "Tài khoản nhận lại" : action === "refund" ? "Tài khoản hoàn tiền" : "Tài khoản nguồn"}<select required={action !== "spend"} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
        {action === "spend" && <option value="">Tự động chia theo nguồn</option>}
        {(action === "allocate" ? allocationAccounts : activeAccounts).map((account) => <option key={account.id} value={account.id}>{account.name} · {action === "allocate"
          ? `có thể dành ${formatMoney(getAccountAvailableToAllocate(ledger, account.id))}`
          : `trong hũ ${formatMoney(getJarView(ledger, selected).sources.find((item) => item.accountId === account.id)?.amount ?? 0)}`}</option>)}
      </select></label>
      {action === "allocate" && allocationAccounts.length === 0 && <p className="jars-warning" role="status">Chưa có tài khoản đủ điều kiện và còn tiền để nạp hũ. Hãy kiểm tra Sổ tài khoản.</p>}
      {action === "transfer" && <label>Hũ nhận<select required value={toJarId} onChange={(event) => setToJarId(event.target.value)}><option value="">Chọn hũ</option>
        {active.filter((view) => view.jar.id !== selected.id).map((view) => <option key={view.jar.id} value={view.jar.id}>{view.jar.name}</option>)}
      </select></label>}
      {(action === "spend" || action === "refund") && <label>Ngày<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>}
      {action === "spend" && <><label>Nhãn khoản chi<input list="jar-linked-labels" required value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <datalist id="jar-linked-labels">{selected.linkedLabels.map((label) => <option value={label} key={label} />)}</datalist>
        </>}
      {(action === "spend" || action === "refund") && <label>{action === "refund" ? "Khoản chi gốc ảnh hưởng mục tiêu?" : "Ảnh hưởng mục tiêu"}<select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)}>
          <option value="daily_expense">Chi thường ngày · trừ tiến độ</option><option value="goal_allocation">Phân bổ mục tiêu · không trừ tiến độ</option>
        </select></label>}
      <label>Ghi chú<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nội dung" /></label>
      {error && <p className="jars-error" role="alert">{error}</p>}
      <div className="jars-form-actions"><button onClick={() => { setAction(null); setEditingActivity(null); }} type="button">Hủy</button>
        <button className="jars-primary" type="submit" disabled={action === "allocate" && allocationAccounts.length === 0}>{editingActivity ? "Lưu sửa" : "Xác nhận"}</button></div>
    </form></div>}
  </div>;
}
