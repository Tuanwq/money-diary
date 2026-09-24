import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { usePhotoDialog } from "../hooks/usePhotoDialog.ts";
import { useStoryImage } from "../hooks/useStoryImage.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";

type Repository = ReturnType<typeof createPhotoAttachmentRepository>;
type Point = { x: number; y: number };
const clampScale = (value: number) => Math.min(4, Math.max(1, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function FullscreenImageViewer({ attachments, index, isOpen, onClose, onIndexChange, repository }: {
  attachments: PhotoAttachment[]; index: number; isOpen: boolean; onClose: () => void;
  onIndexChange: (index: number) => void; repository: Repository;
}) {
  const attachment = attachments[index];
  const { url, error, retry, fail } = useStoryImage(isOpen ? attachment?.storagePath : undefined, repository);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const start = useRef<Point>({ x: 0, y: 0 });
  const last = useRef<Point>({ x: 0, y: 0 });
  const pinch = useRef({ distance: 1, scale: 1 });
  const hadPinch = useRef(false);
  const moved = useRef(false);
  const lastTap = useRef(0);
  const scaleRef = useRef(scale);
  usePhotoDialog(isOpen && Boolean(attachment), onClose);
  useEffect(() => {
    if (!isOpen || attachments.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); onIndexChange(index - 1); }
      if (event.key === "ArrowRight" && index < attachments.length - 1) { event.preventDefault(); onIndexChange(index + 1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attachments.length, index, isOpen, onIndexChange]);

  function changeScale(next: number) {
    const value = clampScale(next);
    scaleRef.current = value;
    setScale(value);
    if (value === 1) setOffset({ x: 0, y: 0 });
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget && (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) { moved.current = false; hadPinch.current = false; }
    if (pointers.current.size === 1) { start.current = point; last.current = point; }
    if (pointers.current.size === 2) {
      hadPinch.current = true;
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: distance(a, b) || 1, scale: scaleRef.current };
    }
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      changeScale(pinch.current.scale * distance(a, b) / pinch.current.distance);
      moved.current = true;
    } else if (scaleRef.current > 1) {
      const dx = point.x - last.current.x;
      const dy = point.y - last.current.y;
      setOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
    } else if (distance(point, start.current) > 12) moved.current = true;
    last.current = point;
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size) { last.current = [...pointers.current.values()][0]; return; }
    if (hadPinch.current) { hadPinch.current = false; return; }
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (scaleRef.current === 1 && moved.current) {
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0 && index < attachments.length - 1) onIndexChange(index + 1);
        if (dx > 0 && index > 0) onIndexChange(index - 1);
      } else if (dy > 95 && dy > Math.abs(dx) * 1.2) onClose();
      return;
    }
    if (!moved.current && event.pointerType === "touch") {
      const now = Date.now();
      if (now - lastTap.current < 320) { changeScale(scaleRef.current > 1 ? 1 : 2); lastTap.current = 0; }
      else lastTap.current = now;
    } else if (!moved.current && event.pointerType === "mouse") changeScale(scaleRef.current > 1 ? 1 : 2);
  }
  function wheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeScale(scaleRef.current + (event.deltaY < 0 ? 0.25 : -0.25));
  }
  if (!isOpen || !attachment) return null;
  return createPortal(<div className="day-story-viewer" role="dialog" aria-modal="true" aria-label={`Ảnh ${index + 1} trên ${attachments.length}`}>
    <div className="day-story-viewer-bar"><span>{index + 1}/{attachments.length}</span>
      <div><button type="button" aria-label="Thu nhỏ" onClick={() => changeScale(scale - 0.5)}><ZoomOut size={20} /></button>
        <button type="button" aria-label="Phóng to" onClick={() => changeScale(scale + 0.5)}><ZoomIn size={20} /></button>
        <button type="button" aria-label="Đóng ảnh" onClick={onClose}><X size={23} /></button></div></div>
    <div className="day-story-viewer-stage" onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={pointerUp} onPointerCancel={(event) => pointers.current.delete(event.pointerId)} onWheel={wheel}>
      {url ? <img draggable={false} src={url} alt={`Ảnh tài chính ${index + 1}`}
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }} onError={fail} />
        : <div className="day-story-viewer-loading">{error || "Đang tải ảnh..."}{error && <button type="button" onClick={retry}>Thử lại</button>}</div>}
    </div>
    {attachments.length > 1 && <div className="day-story-viewer-nav">
      <button type="button" aria-label="Ảnh trước" disabled={index === 0} onClick={() => onIndexChange(index - 1)}><ChevronLeft size={25} /></button>
      <button type="button" aria-label="Ảnh sau" disabled={index === attachments.length - 1} onClick={() => onIndexChange(index + 1)}><ChevronRight size={25} /></button>
    </div>}
    <p className="day-story-viewer-hint">Chạm hai lần hoặc cuộn để phóng to · vuốt xuống để đóng</p>
  </div>, document.body);
}
