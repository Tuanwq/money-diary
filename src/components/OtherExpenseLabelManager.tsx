import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  DEFAULT_OTHER_EXPENSE_LABELS,
  STORAGE_OTHER_EXPENSE_LABELS_KEY,
} from "../constants";

type OtherExpenseLabelManagerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isSameLabel(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" }) === 0;
}

function dedupeLabels(labels: string[]) {
  const uniqueLabels: string[] = [];

  labels.forEach((label) => {
    const normalized = normalizeLabel(label);

    if (normalized && !uniqueLabels.some((item) => isSameLabel(item, normalized))) {
      uniqueLabels.push(normalized);
    }
  });

  return uniqueLabels;
}

function loadLabels() {
  if (typeof window === "undefined") return DEFAULT_OTHER_EXPENSE_LABELS;

  try {
    const savedLabels = window.localStorage.getItem(STORAGE_OTHER_EXPENSE_LABELS_KEY);
    const parsedLabels = savedLabels ? (JSON.parse(savedLabels) as unknown) : [];

    if (!Array.isArray(parsedLabels)) return DEFAULT_OTHER_EXPENSE_LABELS;

    return dedupeLabels([
      ...DEFAULT_OTHER_EXPENSE_LABELS,
      ...parsedLabels.filter((label): label is string => typeof label === "string"),
    ]);
  } catch {
    return DEFAULT_OTHER_EXPENSE_LABELS;
  }
}

export function OtherExpenseLabelManager({
  value,
  onChange,
  className = "",
}: OtherExpenseLabelManagerProps) {
  const fieldId = useId();
  const [labels, setLabels] = useState<string[]>(() => loadLabels());
  const [draftLabel, setDraftLabel] = useState("");
  const normalizedValue = normalizeLabel(value);
  const selectedLabel = labels.find((label) => isSameLabel(label, normalizedValue));
  const selectValue = selectedLabel ?? normalizedValue;
  const displayLabels = useMemo(() => {
    if (normalizedValue && !labels.some((label) => isSameLabel(label, normalizedValue))) {
      return [...labels, normalizedValue];
    }

    return labels;
  }, [labels, normalizedValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_OTHER_EXPENSE_LABELS_KEY, JSON.stringify(labels));
  }, [labels]);

  function addLabel() {
    const nextLabel = normalizeLabel(draftLabel);
    if (!nextLabel) {
      alert("Bạn chưa nhập tên nhãn.");
      return;
    }

    setLabels((current) => dedupeLabels([...current.filter((label) => !isSameLabel(label, nextLabel)), nextLabel]));
    onChange(nextLabel);
    setDraftLabel("");
  }

  function renameSelectedLabel() {
    if (!selectValue) {
      alert("Bạn chưa chọn nhãn để đổi tên.");
      return;
    }

    const nextLabel = normalizeLabel(draftLabel);
    if (!nextLabel) {
      alert("Bạn chưa nhập tên nhãn mới.");
      return;
    }

    setLabels((current) => dedupeLabels(current.map((label) => (isSameLabel(label, selectValue) ? nextLabel : label))));
    onChange(nextLabel);
    setDraftLabel("");
  }

  function deleteSelectedLabel() {
    if (!selectValue) {
      alert("Bạn chưa chọn nhãn để xóa.");
      return;
    }

    if (!confirm(`Xóa nhãn "${selectValue}" khỏi danh sách?`)) return;
    setLabels((current) => current.filter((label) => !isSameLabel(label, selectValue)));
    onChange("");
    setDraftLabel("");
  }

  return (
    <div className={`other-expense-label-manager ${className}`.trim()}>
      <label htmlFor={`${fieldId}-select`}>Nhãn</label>
      <select
        id={`${fieldId}-select`}
        value={selectValue}
        onChange={(event) => {
          onChange(event.target.value);
          setDraftLabel(event.target.value);
        }}
      >
        <option value="">Chưa chọn</option>
        {displayLabels.map((label) => <option key={label} value={label}>{label}</option>)}
      </select>

      <details className="other-expense-label-manager__tools">
        <summary><Settings2 size={15} aria-hidden="true" />Quản lý nhãn</summary>
        <div>
          <label htmlFor={`${fieldId}-draft`}>Tên nhãn</label>
          <input
            id={`${fieldId}-draft`}
            type="text"
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            placeholder="VD: Xăng, tiền điện..."
          />
          <div>
            <button type="button" onClick={addLabel}><Plus size={15} aria-hidden="true" />Thêm</button>
            <button type="button" onClick={renameSelectedLabel} disabled={!selectValue}><Pencil size={15} aria-hidden="true" />Đổi tên</button>
            <button type="button" className="is-danger" onClick={deleteSelectedLabel} disabled={!selectValue}><Trash2 size={15} aria-hidden="true" />Xóa</button>
          </div>
        </div>
      </details>
    </div>
  );
}
