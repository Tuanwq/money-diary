import { useRef, type TouchEvent } from "react";
import type { Page } from "../../../types.ts";

/** Ignores controls, vertical scrolling and the iOS back-gesture edge. */
export function useSwipeNavigation(page: Page, navigate: (page: Page) => void) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (!["home", "photoJournal", "spendingJars"].includes(page)) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [data-horizontal-gesture]")) return;
    const touch = event.touches[0];
    if (!touch || touch.clientX < 28 || touch.clientX > window.innerWidth - 28) return;
    start.current = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
  }
  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    const saved = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    if (!saved || !touch) return;
    const dx = touch.clientX - saved.x;
    const dy = touch.clientY - saved.y;
    const duration = Math.max(1, event.timeStamp - saved.time);
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.4 ||
      (duration > 700 && Math.abs(dx) / duration < 0.12)) return;
    if (page === "home" && dx > 0) navigate("spendingJars");
    if (page === "home" && dx < 0) navigate("photoJournal");
    if ((page === "photoJournal" && dx > 0) || (page === "spendingJars" && dx < 0)) navigate("home");
  }
  return { onTouchStart, onTouchEnd, onTouchCancel: () => { start.current = null; } };
}
