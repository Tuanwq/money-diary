type AuthPageProps = {
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  handleLogin: () => void;
  handleSignUp: () => void;
};

export function AuthPage({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  handleLogin,
  handleSignUp,
}: AuthPageProps) {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold">Đăng nhập để đồng bộ</h2>

        <p className="mt-2 text-sm text-slate-500">
          Dùng cùng một tài khoản trên laptop và điện thoại để dữ liệu tự đồng
          bộ.
        </p>

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
              className="rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
            >
              Đăng nhập
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              className="rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
            >
              Đăng ký
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
