import { ThemeToggle } from "../components/ThemeToggle";
import { PopupNotice } from "../components/feedback/PopupNotice.tsx";
import type { ThemeMode } from "../hooks/useThemeMode";

function hasExpiredConfirmationLink(): boolean {
  if (typeof window === "undefined") return false;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  return hash.get("error_code") === "otp_expired" || query.get("error_code") === "otp_expired";
}

type AuthPageProps = {
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  handleLogin: () => void;
  handleSignUp: () => void;
  handleResendConfirmation: () => void;
  supabaseEnvError?: string;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
};

export function AuthPage({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  handleLogin,
  handleSignUp,
  handleResendConfirmation,
  supabaseEnvError = "",
  themeMode,
  toggleThemeMode,
}: AuthPageProps) {
  const expiredLink = hasExpiredConfirmationLink();

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-end">
          <ThemeToggle
            themeMode={themeMode}
            toggleThemeMode={toggleThemeMode}
          />
        </div>

        <h2 className="text-2xl font-bold">Đăng nhập để đồng bộ</h2>

        <p className="mt-2 text-sm text-slate-500">
          Dùng cùng một tài khoản trên laptop và điện thoại để dữ liệu tự đồng
          bộ.
        </p>

        <PopupNotice message={supabaseEnvError} />
        <PopupNotice tone="warning" message={expiredLink
          ? "Link xác nhận đã hết hạn hoặc đã được sử dụng. Nhập email đã đăng ký bên dưới rồi gửi lại link mới." : ""} />

        <form
          className="mt-5 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mật khẩu</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ít nhất 6 ký tự"
              autoComplete="current-password"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={Boolean(supabaseEnvError)}
              className="rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
            >
              Đăng nhập
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={Boolean(supabaseEnvError)}
              className="rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
            >
              Đăng ký
            </button>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={Boolean(supabaseEnvError)}
              className="rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
            >
              Gửi lại email xác nhận
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Sau khi đăng nhập, dữ liệu nhật ký và mục tiêu sẽ được lưu lên cloud.
        </p>
      </section>
    </main>
  );
}
