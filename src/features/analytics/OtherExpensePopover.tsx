import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "../../utils/money.ts";

type OtherCategory = { name: string; percentage: number; value: number };
type PopoverPosition = {
  bottom?: number;
  left: number;
  maxHeight: number;
  top?: number;
  width: number;
};

function positionFromTrigger(rect: DOMRect, clickX?: number): PopoverPosition {
  const gap = 8;
  const edge = 12;
  const width = Math.min(300, window.innerWidth - edge * 2);
  const left = Math.max(edge, Math.min(
    (clickX ?? rect.left + rect.width / 2) - width / 2,
    window.innerWidth - width - edge
  ));
  const below = window.innerHeight - rect.bottom - gap - edge;
  const above = rect.top - gap - edge;
  const placeAbove = below < 200 && above > below;
  return {
    left,
    width,
    maxHeight: Math.max(80, Math.min(320, placeAbove ? above : below)),
    ...(placeAbove
      ? { bottom: window.innerHeight - rect.top + gap }
      : { top: rect.bottom + gap }),
  };
}

export function OtherExpensePopover({ categories }: { categories: OtherCategory[] }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (!position) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setPosition(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPosition(null);
        triggerRef.current?.focus();
      }
    }
    function onScroll(event: Event) {
      if (event.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      setPosition(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [position]);

  if (categories.length === 0) return null;
  const total = categories.reduce((sum, category) => sum + category.value, 0);

  return (
    <>
      <button
        aria-controls="analytics-other-expense-popover"
        aria-expanded={position !== null}
        aria-haspopup="dialog"
        className="analytics-expense-other-trigger"
        onClick={(event) => setPosition(position
          ? null
          : positionFromTrigger(event.currentTarget.getBoundingClientRect(),
            event.detail > 0 ? event.clientX : undefined))}
        ref={triggerRef}
        type="button"
      >
        Xem chi tiết nhãn khác
      </button>
      {position && createPortal(
        <div
          aria-labelledby="analytics-other-expense-title"
          className="analytics-expense-other-popover"
          id="analytics-other-expense-popover"
          ref={popoverRef}
          role="dialog"
          style={position}
        >
          <div className="analytics-expense-other-popover__header">
            <div>
              <strong id="analytics-other-expense-title">Nhãn khác</strong>
              <small>{categories.length} nhãn · {formatMoney(total)}</small>
            </div>
            <button aria-label="Đóng chi tiết nhãn khác" onClick={() => setPosition(null)} type="button">
              <X aria-hidden="true" size={17} />
            </button>
          </div>
          <div className="analytics-expense-other-popover__list">
            {categories.map((category) => (
              <div key={category.name}>
                <span>{category.name}</span>
                <strong>{formatMoney(category.value)}</strong>
                <small>{category.percentage}%</small>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
