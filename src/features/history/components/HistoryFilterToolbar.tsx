import { Filter, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type HistoryQuickFilter<T extends string> = {
  label: string;
  value: T;
};

export type ActiveHistoryFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

type HistoryFilterToolbarProps<T extends string> = {
  activeFilters?: ActiveHistoryFilter[];
  extraFilters?: ReactNode;
  filterCount?: number;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  onQuickFilter: (value: T) => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  placeholder: string;
  quickFilters: HistoryQuickFilter<T>[];
  search: string;
  toDate: string;
};

export function HistoryFilterToolbar<T extends string>({
  activeFilters = [],
  extraFilters,
  filterCount = 0,
  fromDate,
  onFromDateChange,
  onQuickFilter,
  onReset,
  onSearchChange,
  onToDateChange,
  placeholder,
  quickFilters,
  search,
  toDate,
}: HistoryFilterToolbarProps<T>) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isFilterOpen) return;

    const previousOverflow = document.body.style.overflow;
    const filterButton = filterButtonRef.current;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input, select, button")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsFilterOpen(false);
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled])"
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      filterButton?.focus();
    };
  }, [isFilterOpen]);

  const mobileQuickFilters = quickFilters.slice(0, 3);

  return (
    <section className="history-filter-toolbar" aria-label="Tìm kiếm và lọc lịch sử">
      <label className="history-search-field">
        <span className="sr-only">Tìm kiếm lịch sử</span>
        <Search aria-hidden="true" size={18} />
        <input
          type="search"
          value={search}
          placeholder={placeholder}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <div className="history-date-fields is-desktop">
        <DateField label="Từ ngày" value={fromDate} onChange={onFromDateChange} />
        <DateField label="Đến ngày" value={toDate} onChange={onToDateChange} />
      </div>

      <button
        ref={filterButtonRef}
        type="button"
        className="history-filter-button"
        aria-expanded={isFilterOpen}
        aria-controls="history-filter-panel"
        onClick={() => setIsFilterOpen(true)}
      >
        <Filter aria-hidden="true" size={18} />
        <span>Bộ lọc{filterCount > 0 ? ` ${filterCount}` : ""}</span>
      </button>

      <div className="history-quick-filters" aria-label="Lọc nhanh theo thời gian">
        {quickFilters.map((filter) => (
          <button key={filter.value} type="button" onClick={() => onQuickFilter(filter.value)}>
            {filter.label}
          </button>
        ))}
      </div>

      <div className="history-quick-filters is-mobile" aria-label="Lọc nhanh trên điện thoại">
        {mobileQuickFilters.map((filter) => (
          <button key={filter.value} type="button" onClick={() => onQuickFilter(filter.value)}>
            {filter.label}
          </button>
        ))}
      </div>

      {activeFilters.length > 0 && (
        <div className="history-active-filters">
          <span>Đang lọc:</span>
          {activeFilters.map((filter) => (
            <button key={filter.id} type="button" onClick={filter.onRemove}>
              {filter.label}
              <X aria-hidden="true" size={14} />
            </button>
          ))}
          <button type="button" className="history-reset-filter" onClick={onReset}>
            Đặt lại
          </button>
        </div>
      )}

      {isFilterOpen && (
        <div className="history-filter-layer" role="presentation">
          <button
            type="button"
            className="history-filter-backdrop"
            aria-label="Đóng bộ lọc"
            onClick={() => setIsFilterOpen(false)}
          />
          <div
            ref={panelRef}
            id="history-filter-panel"
            className="history-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header>
              <div>
                <h2 id={titleId}>Bộ lọc</h2>
                <p>Thu hẹp danh sách bằng thời gian và điều kiện phù hợp.</p>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setIsFilterOpen(false)}>
                <X aria-hidden="true" size={19} />
              </button>
            </header>

            <div className="history-filter-panel__fields">
              <DateField label="Từ ngày" value={fromDate} onChange={onFromDateChange} />
              <DateField label="Đến ngày" value={toDate} onChange={onToDateChange} />
              {extraFilters}
            </div>

            <footer>
              <button type="button" className="history-filter-reset" onClick={onReset}>
                Đặt lại
              </button>
              <button type="button" className="history-filter-apply" onClick={() => setIsFilterOpen(false)}>
                Áp dụng
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="history-date-field">
      <span>{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
