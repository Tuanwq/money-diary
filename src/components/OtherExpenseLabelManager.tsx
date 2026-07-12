import { useEffect, useMemo, useState } from "react";
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

    if (
      normalized &&
      !uniqueLabels.some((item) => isSameLabel(item, normalized))
    ) {
      uniqueLabels.push(normalized);
    }
  });

  return uniqueLabels;
}

function loadLabels() {
  if (typeof window === "undefined") {
    return DEFAULT_OTHER_EXPENSE_LABELS;
  }

  try {
    const savedLabels = window.localStorage.getItem(
      STORAGE_OTHER_EXPENSE_LABELS_KEY
    );
    const parsedLabels = savedLabels ? (JSON.parse(savedLabels) as unknown) : [];

    if (!Array.isArray(parsedLabels)) {
      return DEFAULT_OTHER_EXPENSE_LABELS;
    }

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
  const [labels, setLabels] = useState<string[]>(() => loadLabels());
  const [draftLabel, setDraftLabel] = useState("");
  const normalizedValue = normalizeLabel(value);
  const selectedLabel = labels.find((label) => isSameLabel(label, normalizedValue));
  const selectValue = selectedLabel ?? normalizedValue;
  const displayLabels = useMemo(() => {
    if (
      normalizedValue &&
      !labels.some((label) => isSameLabel(label, normalizedValue))
    ) {
      return [...labels, normalizedValue];
    }

    return labels;
  }, [labels, normalizedValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      STORAGE_OTHER_EXPENSE_LABELS_KEY,
      JSON.stringify(labels)
    );
  }, [labels]);

  function addLabel() {
    const nextLabel = normalizeLabel(draftLabel);

    if (!nextLabel) {
      alert("Bạn chưa nhập tên nhãn.");
      return;
    }

    setLabels((prev) =>
      dedupeLabels([
        ...prev.filter((label) => !isSameLabel(label, nextLabel)),
        nextLabel,
      ])
    );
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

    setLabels((prev) =>
      dedupeLabels(
        prev.map((label) => (isSameLabel(label, selectValue) ? nextLabel : label))
      )
    );
    onChange(nextLabel);
    setDraftLabel("");
  }

  function deleteSelectedLabel() {
    if (!selectValue) {
      alert("Bạn chưa chọn nhãn để xóa.");
      return;
    }

    const confirmed = confirm(`Xóa nhãn "${selectValue}" khỏi danh sách?`);
    if (!confirmed) return;

    setLabels((prev) => prev.filter((label) => !isSameLabel(label, selectValue)));
    onChange("");
    setDraftLabel("");
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium">Nhãn khoản khác</label>
      <select
        value={selectValue}
        onChange={(event) => {
          onChange(event.target.value);
          setDraftLabel(event.target.value);
        }}
        className="app-input mt-1 w-full rounded-xl border px-3 py-2"
      >
        <option value="">Chưa chọn</option>
        {displayLabels.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>

      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <input
          type="text"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          placeholder="VD: Xăng, tiền điện..."
          className="app-input min-w-0 rounded-xl border px-3 py-2"
        />
        <button
          type="button"
          onClick={addLabel}
          className="app-primary-button rounded-xl px-3 py-2 text-sm font-bold"
        >
          Thêm
        </button>
        <button
          type="button"
          onClick={renameSelectedLabel}
          disabled={!selectValue}
          className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={deleteSelectedLabel}
          disabled={!selectValue}
          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
