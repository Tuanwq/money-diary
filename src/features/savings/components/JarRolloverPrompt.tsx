import { useEffect, useRef, useState } from "react";
import { CookingPot, PiggyBank } from "lucide-react";
import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import { getPendingJarRollover } from "../domain/jarRollover.ts";
import type { SavingsCommand } from "../services/savingsService.ts";
import { formatMoney } from "../../../utils/money.ts";
import "./JarRolloverPrompt.css";

export function JarRolloverPrompt({ ledger, today, ready, onCommand }: {
  ledger: AccountLedgerData; today: string; ready: boolean;
  onCommand: (command: SavingsCommand) => void;
}) {
  const [mode, setMode] = useState<"allocate" | "transfer">("allocate");
  const [destinationId, setDestinationId] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const pending = ready ? getPendingJarRollover(ledger, today) : null;
  const accounts = ledger.accounts.filter((account) => !account.archivedAt);
  const total = pending?.jars.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  useEffect(() => {
    if (!pending?.jars.length) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("input")?.focus());
    function keepFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled)')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keepFocus);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keepFocus); previous?.focus(); };
  }, [pending?.period, pending?.jars.length]);

  if (!pending?.jars.length) return null;
  function submit(decision: "skip" | "allocate" | "transfer") {
    try {
      setError("");
      onCommand({ type: "rollover_jars", today, decision,
        destinationAccountId: decision === "transfer" ? destinationId : undefined });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa chuyển được tiền dư của hũ.");
    }
  }
  return <div className="jar-rollover-backdrop">
    <section className="jar-rollover-dialog" role="dialog" aria-modal="true"
      aria-labelledby="jar-rollover-title" aria-describedby="jar-rollover-description" ref={dialogRef}>
      <div className="jar-rollover-icon"><CookingPot aria-hidden="true" size={23} /></div>
      <h2 id="jar-rollover-title">Tiền dư hũ tháng {pending.period.slice(5)}/{pending.period.slice(0, 4)}</h2>
      <p id="jar-rollover-description">{pending.jars.length} hũ còn {formatMoney(total)} đã phân bổ. Bạn có muốn đưa toàn bộ phần dư này vào Tiết kiệm không?</p>
      <ul className="jar-rollover-list">{pending.jars.map(({ jar, amount }) =>
        <li key={jar.id}><span>{jar.icon} {jar.name}</span><strong>{formatMoney(amount)}</strong></li>)}</ul>
      <fieldset className="jar-rollover-options"><legend>Cách tiết kiệm</legend>
        <label><input type="radio" name="jar-rollover-mode" checked={mode === "allocate"}
          onChange={() => setMode("allocate")} /> Dành riêng tiền trong Tiết kiệm</label>
        <label><input type="radio" name="jar-rollover-mode" checked={mode === "transfer"}
          onChange={() => setMode("transfer")} /> Tự ghi chuyển vào tài khoản tiết kiệm</label>
      </fieldset>
      {mode === "transfer" && <label className="jar-rollover-destination">Tài khoản tiết kiệm nhận tiền
        <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
          <option value="">Chọn tài khoản nhận</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select><small>App ghi giao dịch chuyển nội bộ; không thực hiện chuyển khoản ngân hàng.</small></label>}
      {error && <p className="jar-rollover-error" role="alert">{error}</p>}
      <div className="jar-rollover-actions">
        <button type="button" className="jar-rollover-decline" onClick={() => submit("skip")}>Không, giữ trong hũ</button>
        <button type="button" className="jar-rollover-accept" disabled={mode === "transfer" && !destinationId}
          onClick={() => submit(mode)}><PiggyBank aria-hidden="true" size={17} /> Có, đưa vào tiết kiệm</button>
      </div>
    </section>
  </div>;
}
