import {
  ArchiveRestore,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  DatabaseBackup,
  Download,
  Eye,
  FileJson,
  HardDrive,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createBackupExport,
  createBackupRecord,
  createBackupSnapshot,
  parseBackupFile,
  type BackupListItem,
  type BackupSection,
  type BackupSnapshot,
  type BackupSourceData,
} from "./backupModel";
import {
  deleteBackupRecord,
  enforceBackupRetention,
  loadBackupRecords,
  saveBackupRecord,
} from "./backupStorage";
import { STORAGE_LAST_CLOUD_SYNC_AT_KEY } from "./useAutomaticBackups";

const BACKUPS_PER_PAGE = 5;
const ALL_SECTIONS: BackupSection[] = [
  "journal",
  "goals",
  "hub",
  "accounts",
  "automation",
  "cashFlow",
];

const SECTION_CONTENT: Record<
  BackupSection,
  { description: string; label: string }
> = {
  accounts: {
    description: "Tài khoản, số dư đầu kỳ và toàn bộ giao dịch trong sổ.",
    label: "Sổ tài khoản",
  },
  automation: {
    description: "Quy tắc, lịch sử chạy và khóa chống xử lý trùng.",
    label: "Tự động hóa",
  },
  cashFlow: {
    description: "Kế hoạch thu chi và các khoản lặp lại dùng trong dự báo.",
    label: "Dự báo dòng tiền",
  },
  journal: {
    description: "Nhật ký, chi tiêu, kiểm kê và lịch sử thay đổi.",
    label: "Nhật ký và thu chi",
  },
  goals: {
    description: "Mục tiêu chính, mục tiêu phụ và mục tiêu đã hoàn thành.",
    label: "Mục tiêu",
  },
  hub: {
    description: "Ca làm, cài đặt, máy tính và lịch sử thay đổi Hub.",
    label: "Hub / Ca làm",
  },
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Không xác định";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getSyncWarning(syncStatus: string) {
  const saved = localStorage.getItem(STORAGE_LAST_CLOUD_SYNC_AT_KEY);
  const lastSync = saved ? new Date(saved) : null;
  const isValid = lastSync && !Number.isNaN(lastSync.getTime());

  if (!isValid) {
    return syncStatus.toLocaleLowerCase("vi-VN").includes("đã đồng bộ")
      ? ""
      : "Thiết bị chưa ghi nhận lần đồng bộ cloud thành công.";
  }

  const elapsedDays = Math.floor(
    (Date.now() - lastSync.getTime()) / 86400000
  );

  return elapsedDays >= 3
    ? `Đã ${elapsedDays} ngày chưa đồng bộ cloud thành công. Hãy kiểm tra kết nối trước khi đổi thiết bị.`
    : "";
}

function downloadJson(record: BackupListItem | ReturnType<typeof createBackupRecord>) {
  const content = JSON.stringify(createBackupExport(record), null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const dateKey = record.createdAt.slice(0, 10);

  anchor.href = url;
  anchor.download = `money-diary-backup-${dateKey}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function BackupLocation({ location }: { location: BackupListItem["location"] }) {
  if (location === "both") {
    return (
      <span className="backup-location is-cloud">
        <Cloud aria-hidden="true" size={14} />
        Thiết bị và cloud
      </span>
    );
  }

  if (location === "cloud") {
    return (
      <span className="backup-location is-cloud">
        <Cloud aria-hidden="true" size={14} />
        Cloud
      </span>
    );
  }

  return (
    <span className="backup-location">
      <HardDrive aria-hidden="true" size={14} />
      Thiết bị
    </span>
  );
}

function BackupPreview({
  isRestoring,
  onClose,
  onRestore,
  record,
}: {
  isRestoring: boolean;
  onClose: () => void;
  onRestore: (sections: BackupSection[]) => void;
  record: BackupListItem;
}) {
  const [sections, setSections] = useState<BackupSection[]>(ALL_SECTIONS);
  const dialogRef = useRef<HTMLDivElement>(null);
  const allSelected = sections.length === ALL_SECTIONS.length;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isRestoring) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRestoring, onClose]);

  function toggleSection(section: BackupSection) {
    setSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section]
    );
  }

  return (
    <div
      className="backup-preview-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isRestoring) onClose();
      }}
    >
      <div
        ref={dialogRef}
        aria-labelledby="backup-preview-title"
        aria-modal="true"
        className="backup-preview-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <header className="backup-preview-header">
          <div>
            <span>
              <Eye aria-hidden="true" size={17} />
              Xem trước backup
            </span>
            <h3 id="backup-preview-title">{record.label}</h3>
            <p>
              Tạo lúc {formatDateTime(record.createdAt)} · phiên bản{" "}
              {record.snapshot.appVersion}
            </p>
          </div>
          <button
            aria-label="Đóng xem trước backup"
            className="backup-icon-button"
            disabled={isRestoring}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="backup-preview-summary">
          <div>
            <span>Nhật ký</span>
            <strong>{record.summary.journalEntries}</strong>
          </div>
          <div>
            <span>Chi tiêu</span>
            <strong>{record.summary.expenses}</strong>
          </div>
          <div>
            <span>Kiểm kê</span>
            <strong>{record.summary.balanceChecks}</strong>
          </div>
          <div>
            <span>Mục tiêu phụ</span>
            <strong>{record.summary.subGoals}</strong>
          </div>
          <div>
            <span>Ca Hub</span>
            <strong>{record.summary.hubShifts}</strong>
          </div>
          <div>
            <span>Tài khoản</span>
            <strong>{record.summary.financialAccounts ?? 0}</strong>
          </div>
          <div>
            <span>Quy tắc</span>
            <strong>{record.summary.automationRules ?? 0}</strong>
          </div>
          <div>
            <span>Kế hoạch dòng tiền</span>
            <strong>{record.summary.cashFlowPlans ?? 0}</strong>
          </div>
        </div>

        <div className="backup-section-heading">
          <div>
            <h4>Chọn dữ liệu cần khôi phục</h4>
            <p>Dữ liệu không được chọn sẽ giữ nguyên.</p>
          </div>
          <button
            className="backup-text-button"
            onClick={() => setSections(allSelected ? [] : ALL_SECTIONS)}
            type="button"
          >
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>

        <div className="backup-section-options">
          {ALL_SECTIONS.map((section) => {
            const selected = sections.includes(section);

            return (
              <label
                className={`backup-section-option ${selected ? "is-selected" : ""}`}
                key={section}
              >
                <input
                  checked={selected}
                  onChange={() => toggleSection(section)}
                  type="checkbox"
                />
                <span className="backup-section-check">
                  {selected && <Check aria-hidden="true" size={15} />}
                </span>
                <span>
                  <strong>{SECTION_CONTENT[section].label}</strong>
                  <small>{SECTION_CONTENT[section].description}</small>
                </span>
              </label>
            );
          })}
        </div>

        <p className="backup-restore-note">
          <ShieldCheck aria-hidden="true" size={17} />
          Ứng dụng sẽ tạo một bản an toàn trước khi khôi phục.
        </p>

        <footer className="backup-preview-actions">
          <button
            className="notification-secondary-button"
            disabled={isRestoring}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="notification-primary-button"
            disabled={isRestoring || sections.length === 0}
            onClick={() => onRestore(sections)}
            type="button"
          >
            <ArchiveRestore aria-hidden="true" size={17} />
            {isRestoring ? "Đang khôi phục..." : "Khôi phục dữ liệu"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function BackupCenter({
  onRestore,
  source,
  syncStatus,
  userId,
}: {
  onRestore: (
    snapshot: BackupSnapshot,
    sections: BackupSection[]
  ) => Promise<void> | void;
  source: BackupSourceData;
  syncStatus: string;
  userId: string;
}) {
  const [records, setRecords] = useState<BackupListItem[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BackupListItem | null>(
    null
  );
  const [cloudAvailable, setCloudAvailable] = useState(true);
  const [cloudError, setCloudError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncWarning = getSyncWarning(syncStatus);
  const totalPages = Math.max(1, Math.ceil(records.length / BACKUPS_PER_PAGE));
  const paginatedRecords = useMemo(
    () =>
      records.slice(
        (page - 1) * BACKUPS_PER_PAGE,
        page * BACKUPS_PER_PAGE
      ),
    [page, records]
  );

  const refresh = useCallback(async () => {
    const result = await loadBackupRecords(userId);
    setRecords(result.records);
    setCloudAvailable(result.cloudAvailable);
    setCloudError(result.cloudError);
    setPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(result.records.length / BACKUPS_PER_PAGE)))
    );
  }, [userId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refresh]);

  async function createAndSaveBackup(
    kind: "manual" | "safety" | "imported",
    snapshot = createBackupSnapshot(source)
  ) {
    const record = createBackupRecord({ kind, ownerId: userId, snapshot });
    const result = await saveBackupRecord(record);
    await enforceBackupRetention(userId);
    setCloudAvailable(result.cloudAvailable);
    setCloudError(result.cloudError);

    return record;
  }

  async function handleCreateBackup() {
    setIsBusy(true);
    setFeedback("");

    try {
      await createAndSaveBackup("manual");
      await refresh();
      setFeedback("Đã tạo backup trên thiết bị và gửi đồng bộ cloud.");
    } catch (error) {
      console.error(error);
      setFeedback("Không thể tạo backup. Hãy kiểm tra dung lượng thiết bị.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExport() {
    setIsBusy(true);
    setFeedback("");

    try {
      const record = await createAndSaveBackup("manual");
      downloadJson(record);
      await refresh();
      setFeedback("Đã xuất file JSON và lưu một bản backup thủ công.");
    } catch (error) {
      console.error(error);
      setFeedback("Không thể xuất file backup.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;

    setFeedback("");

    try {
      const record = parseBackupFile(await file.text(), userId);
      setSelectedRecord({ ...record, location: "device" });
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Không thể đọc file backup."
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(record: BackupListItem) {
    if (
      !confirm(
        `Bạn có chắc muốn xóa "${record.label}" tạo lúc ${formatDateTime(
          record.createdAt
        )}?`
      )
    ) {
      return;
    }

    setIsBusy(true);

    try {
      const result = await deleteBackupRecord(userId, record.id);
      setCloudAvailable(result.cloudAvailable);
      setCloudError(result.cloudError);
      await refresh();
      setFeedback("Đã xóa bản backup.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestore(sections: BackupSection[]) {
    if (!selectedRecord) return;

    const confirmed = confirm(
      `Khôi phục ${sections
        .map((section) => SECTION_CONTENT[section].label)
        .join(", ")} từ bản ${formatDateTime(selectedRecord.createdAt)}?`
    );

    if (!confirmed) return;

    setIsRestoring(true);
    setFeedback("");

    try {
      await createAndSaveBackup("safety");

      if (selectedRecord.kind === "imported") {
        await saveBackupRecord(selectedRecord);
      }

      await onRestore(selectedRecord.snapshot, sections);
      await refresh();
      setSelectedRecord(null);
      setFeedback(
        "Khôi phục thành công. Bản dữ liệu trước khôi phục đã được giữ lại."
      );
    } catch (error) {
      console.error(error);
      setFeedback("Khôi phục chưa hoàn tất. Dữ liệu hiện tại chưa bị xóa.");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <section className="backup-center">
      <header className="backup-center-header">
        <div>
          <span className="backup-center-eyebrow">
            <DatabaseBackup aria-hidden="true" size={17} />
            An toàn dữ liệu
          </span>
          <h2>Backup và khôi phục</h2>
          <p>
            Tự giữ 7 bản ngày, 4 bản tuần và 6 bản tháng. Có thể khôi phục riêng
            từng nhóm dữ liệu.
          </p>
        </div>
        <span
          className={`backup-cloud-status ${cloudAvailable ? "is-ready" : "is-warning"}`}
        >
          {cloudAvailable ? (
            <Cloud aria-hidden="true" size={16} />
          ) : (
            <CloudOff aria-hidden="true" size={16} />
          )}
          {cloudAvailable ? "Backup cloud sẵn sàng" : "Đang lưu trên thiết bị"}
        </span>
      </header>

      {(cloudError || syncWarning) && (
        <div className="backup-warning" role="status">
          <CloudOff aria-hidden="true" size={18} />
          <span>
            <strong>Cần kiểm tra đồng bộ</strong>
            <small>{syncWarning || cloudError}</small>
          </span>
        </div>
      )}

      <div className="backup-actions">
        <button
          className="notification-primary-button"
          disabled={isBusy}
          onClick={() => void handleCreateBackup()}
          type="button"
        >
          <DatabaseBackup aria-hidden="true" size={17} />
          {isBusy ? "Đang xử lý..." : "Tạo backup ngay"}
        </button>
        <button
          className="notification-secondary-button"
          disabled={isBusy}
          onClick={() => void handleExport()}
          type="button"
        >
          <Download aria-hidden="true" size={17} />
          Xuất JSON
        </button>
        <button
          className="notification-secondary-button"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" size={17} />
          Nhập backup
        </button>
        <input
          ref={fileInputRef}
          accept="application/json,.json"
          className="backup-file-input"
          onChange={(event) => void handleImport(event.target.files?.[0])}
          type="file"
        />
      </div>

      {feedback && (
        <p className="backup-feedback" role="status">
          {feedback}
        </p>
      )}

      <div className="backup-list-heading">
        <div>
          <h3>Các bản gần đây</h3>
          <p>{records.length} bản trên thiết bị hoặc cloud.</p>
        </div>
        <CalendarClock aria-hidden="true" size={20} />
      </div>

      {paginatedRecords.length === 0 ? (
        <div className="backup-empty-state">
          <FileJson aria-hidden="true" size={24} />
          <strong>Chưa có bản backup</strong>
          <span>Tạo bản đầu tiên hoặc nhập file JSON đã có.</span>
        </div>
      ) : (
        <div className="backup-record-list">
          {paginatedRecords.map((record) => (
            <article className="backup-record" key={record.id}>
              <span className="backup-record-icon">
                {record.kind === "safety" ? (
                  <ShieldCheck aria-hidden="true" size={19} />
                ) : (
                  <DatabaseBackup aria-hidden="true" size={19} />
                )}
              </span>
              <div className="backup-record-copy">
                <strong>{record.label}</strong>
                <span>{formatDateTime(record.updatedAt)}</span>
                <small>
                  {record.summary.journalEntries} nhật ký ·{" "}
                  {record.summary.subGoals} mục tiêu phụ ·{" "}
                  {record.summary.hubShifts} ca Hub
                  {" · "}
                  {record.summary.accountTransactions ?? 0} giao dịch
                  {" · "}
                  {record.summary.automationRules ?? 0} quy tắc
                  {" · "}
                  {record.summary.cashFlowPlans ?? 0} kế hoạch dòng tiền
                </small>
              </div>
              <BackupLocation location={record.location} />
              <div className="backup-record-actions">
                <button
                  aria-label={`Xem trước ${record.label}`}
                  className="backup-icon-button"
                  onClick={() => setSelectedRecord(record)}
                  type="button"
                >
                  <Eye aria-hidden="true" size={18} />
                </button>
                <button
                  aria-label={`Tải xuống ${record.label}`}
                  className="backup-icon-button"
                  onClick={() => downloadJson(record)}
                  type="button"
                >
                  <Download aria-hidden="true" size={18} />
                </button>
                <button
                  aria-label={`Xóa ${record.label}`}
                  className="backup-icon-button is-danger"
                  disabled={isBusy}
                  onClick={() => void handleDelete(record)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="backup-pagination">
          <button
            aria-label="Trang backup trước"
            className="backup-icon-button"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <span>
            Trang {page}/{totalPages}
          </span>
          <button
            aria-label="Trang backup sau"
            className="backup-icon-button"
            disabled={page === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      )}

      {selectedRecord && (
        <BackupPreview
          isRestoring={isRestoring}
          onClose={() => setSelectedRecord(null)}
          onRestore={(sections) => void handleRestore(sections)}
          record={selectedRecord}
        />
      )}
    </section>
  );
}
