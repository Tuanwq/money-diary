type AccountBarProps = {
  email?: string;
  syncStatus: string;
  onExportWord: () => void;
  onOpenChangeLog: () => void;
  onLogout: () => void;
};

export function AccountBar({
  email,
  syncStatus,
  onExportWord,
  onOpenChangeLog,
  onLogout,
}: AccountBarProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">Tài khoản</p>
        <p className="font-bold">{email}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
          {syncStatus}
        </span>

        <button
          type="button"
          onClick={onExportWord}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
        >
          Xuất báo cáo Word
        </button>

        <button
          type="button"
          onClick={onOpenChangeLog}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Lịch sử thay đổi
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Đăng xuất
        </button>
      </div>
    </section>
  );
}
