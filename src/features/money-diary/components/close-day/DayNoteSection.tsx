import { NotebookPen } from "lucide-react";
import { useId, useLayoutEffect, useRef } from "react";
import { CloseDaySectionHeading } from "./CloseDaySectionHeading";

type DayNoteSectionProps = {
  onChange: (value: string) => void;
  value: string;
};

export function DayNoteSection({ onChange, value }: DayNoteSectionProps) {
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [value]);

  return (
    <section className="close-day-section close-day-note">
      <CloseDaySectionHeading
        description="Ghi ngắn những điều cần nhớ trong ngày."
        icon={NotebookPen}
        title="Ghi chú"
      />

      <label className="sr-only" htmlFor={inputId}>
        Ghi chú
      </label>
      <textarea
        ref={textareaRef}
        id={inputId}
        rows={3}
        aria-describedby={helperId}
        value={value}
        onInput={(event) => resizeTextarea(event.currentTarget)}
        onChange={(event) => onChange(event.target.value)}
        placeholder="VD: Hôm nay chạy ổn, tối hơi mệt..."
      />
      <p id={helperId} className="close-day-note__helper">
        Ô ghi chú sẽ tự mở rộng khi bạn nhập thêm nội dung.
      </p>
    </section>
  );
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 288)}px`;
}
