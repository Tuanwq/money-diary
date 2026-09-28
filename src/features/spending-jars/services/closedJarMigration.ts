import { getJarView, type JarActivity, type JarLedger } from "../domain/jarModel.ts";

/** Repairs jars closed before label cleanup and release were added. This only
 * changes jar metadata and allocation activities; financial transactions stay intact. */
export function repairClosedJars<T extends JarLedger>(ledger: T, now: string): T {
  const closed = ledger.jars.filter((jar) => jar.status === "closed");
  if (!closed.length) return ledger;

  const releases: JarActivity[] = [];
  let changed = false;
  const jars = ledger.jars.map((jar) => {
    if (jar.status !== "closed") return jar;
    if (jar.linkedLabels.length === 0) return jar;
    changed = true;
    return { ...jar, linkedLabels: [], updatedAt: now };
  });

  for (const jar of closed) {
    for (const source of getJarView(ledger, jar).sources) {
      if (source.amount <= 0) continue;
      const prefix = `jar-close-repair:${jar.id}:${source.accountId}:`;
      const sequence = ledger.jarActivities.filter((activity) => activity.id.startsWith(prefix)).length;
      releases.push({
        id: `${prefix}${sequence}`,
        jarId: jar.id,
        kind: "release",
        accountId: source.accountId,
        amount: source.amount,
        note: "Giải phóng phần còn lại của hũ đã đóng",
        createdAt: now,
      });
    }
  }

  if (!changed && releases.length === 0) return ledger;
  return { ...ledger, jars, jarActivities: [...ledger.jarActivities, ...releases] };
}
