import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Mood = "good" | "normal" | "tired" | "bad";

type DailyEntry = {
  id: string;
  date: string;
  diary: string;
  income: number;
  workHours: number;
  mood: Mood;
  note: string;
  createdAt: string;
};

type Goals = {
  dailyIncome: number;
  dailyHours: number;
  weeklyIncome: number;
  weeklyHours: number;
  monthlyIncome: number;
  monthlyHours: number;

  bigGoalName: string;
  bigGoalTarget: number;
  bigGoalSaved: number;
  bigGoalDeadline: string;
};

type Page = "home" | "goals" | "entry" | "history";
type GoalScreen = "menu" | "current" | "completed";

type CompletedGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  completedAt: string;
};

const STORAGE_ENTRIES_KEY = "money_diary_entries";
const STORAGE_GOALS_KEY = "money_diary_goals";
const STORAGE_COMPLETED_GOALS_KEY = "money_diary_completed_goals";

const defaultGoals: Goals = {
  dailyIncome: 200000,
  dailyHours: 4,
  weeklyIncome: 1500000,
  weeklyHours: 20,
  monthlyIncome: 0,
  monthlyHours: 0,

  bigGoalName: "Your Goals",
  bigGoalTarget: 40000000,
  bigGoalSaved: 10000000,
  bigGoalDeadline: "2026-08-16",
};

const moodLabels: Record<Mood, string> = {
  good: "Vui",
  normal: "Bình thường",
  tired: "Mệt",
  bad: "Như l",
};

function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  return getDateString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function getProgress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

function toDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

function isSameMonth(dateString: string, now = new Date()) {
  const date = toDate(dateString);
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(dateString: string, now = new Date()) {
  const date = toDate(dateString);

  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDay + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return date >= monday && date <= sunday;
}

function formatDateShort(dateString: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(toDate(dateString));
}

function getDaysLeft(deadline: string) {
  if (!deadline) return 0;

  const today = toDate(getToday());
  const targetDate = toDate(deadline);
  const diffTime = targetDate.getTime() - today.getTime();

  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  target,
  progress,
}: {
  title: string;
  value: string;
  target: string;
  progress: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs text-slate-500 sm:text-sm">{title}</p>

      <h2 className="mt-2 break-words text-xl font-bold text-slate-900 sm:text-2xl">
        {value}
      </h2>

      <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
        Mục tiêu: {target}
      </p>

      <ProgressBar value={progress} />

      <p className="mt-2 text-xs font-medium sm:text-sm">{progress}%</p>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(defaultGoals);
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [goalScreen, setGoalScreen] = useState<GoalScreen>("menu");
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Chưa đồng bộ");

  const [form, setForm] = useState({
    date: getToday(),
    diary: "",
    income: "",
    workHours: "",
    mood: "normal" as Mood,
    note: "",
  });

  useEffect(() => {
    const savedEntries = localStorage.getItem(STORAGE_ENTRIES_KEY);
    const savedGoals = localStorage.getItem(STORAGE_GOALS_KEY);
    const savedCompletedGoals = localStorage.getItem(STORAGE_COMPLETED_GOALS_KEY);

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }

    if (savedGoals) {
      setGoals({
        ...defaultGoals,
        ...JSON.parse(savedGoals),
      });
    }

    if (savedCompletedGoals) {
      setCompletedGoals(JSON.parse(savedCompletedGoals));
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    localStorage.setItem(STORAGE_GOALS_KEY, JSON.stringify(goals));
    localStorage.setItem(
      STORAGE_COMPLETED_GOALS_KEY,
      JSON.stringify(completedGoals)
    );
  }, [entries, goals, completedGoals, loaded]);

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!session?.user) return;

  setCloudLoaded(false);
  loadCloudData(session.user.id);
}, [session?.user.id]);

useEffect(() => {
  if (!session?.user || !cloudLoaded) return;

  const timeout = setTimeout(async () => {
    setSyncStatus("Đang lưu...");

    const { error } = await supabase.from("money_diary_state").upsert({
      user_id: session.user.id,
      entries,
      goals,
      completed_goals: completedGoals,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      setSyncStatus("Lỗi lưu cloud");
      return;
    }

    setSyncStatus("Đã đồng bộ");
  }, 700);

  return () => clearTimeout(timeout);
}, [entries, goals, completedGoals, session?.user.id, cloudLoaded]);

  const todayString = getToday();
  const isSelectedToday = selectedDate === todayString;
  const selectedDateObject = toDate(selectedDate);

  const selectedEntry = entries.find((entry) => entry.date === selectedDate);

  const selectedIncome = selectedEntry?.income ?? 0;
  const selectedHours = selectedEntry?.workHours ?? 0;

  const weekEntries = entries.filter((entry) =>
    isThisWeek(entry.date, selectedDateObject)
  );

  const monthEntries = entries.filter((entry) =>
    isSameMonth(entry.date, selectedDateObject)
  );

  const weekIncome = weekEntries.reduce((sum, entry) => sum + entry.income, 0);
  // const weekHours = weekEntries.reduce((sum, entry) => sum + entry.workHours, 0);

  const monthIncome = monthEntries.reduce((sum, entry) => sum + entry.income, 0);
  const monthHours = monthEntries.reduce(
    (sum, entry) => sum + entry.workHours,
    0
  );

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const chartData = useMemo(() => {
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dateString = getDateString(date);
    const entry = entries.find((item) => item.date === dateString);

    result.push({
      date: formatDateShort(dateString),
      income: entry?.income ?? 0,
      hours: entry?.workHours ?? 0,
    });
  }

    return result;
  }, [entries]);

  const totalIncome = entries.reduce((sum, entry) => sum + entry.income, 0);
  const totalSavedForBigGoal = goals.bigGoalSaved + totalIncome;
  const bigGoalProgress = getProgress(totalSavedForBigGoal, goals.bigGoalTarget);
  const remainingBigGoal = Math.max(goals.bigGoalTarget - totalSavedForBigGoal, 0);
  const daysLeft = getDaysLeft(goals.bigGoalDeadline);
  const needPerDay =
    daysLeft > 0 ? Math.ceil(remainingBigGoal / daysLeft) : remainingBigGoal;

  const incomePerHour = monthHours > 0 ? Math.round(monthIncome / monthHours) : 0;

  function changeSelectedDate(dayAmount: number) {
  const currentDate = toDate(selectedDate);
  currentDate.setDate(currentDate.getDate() + dayAmount);

  const nextDate = getDateString(currentDate);

  if (nextDate > todayString) {
    return;
  }

    setSelectedDate(nextDate);
  }

  function goToPreviousDay() {
    changeSelectedDate(-1);
  }

  function goToNextDay() {
    changeSelectedDate(1);
  }

  function goToToday() {
    setSelectedDate(todayString);
  }

  function handleSelectDate(value: string) {
    if (!value) return;

    if (value > todayString) {
      setSelectedDate(todayString);
      return;
    }

    setSelectedDate(value);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const income = Number(form.income);
    const workHours = Number(form.workHours);

    if (!form.date) {
      alert("Bạn chưa chọn ngày.");
      return;
    }

    if (income < 0 || workHours < 0) {
      alert("Tiền và số giờ làm không được âm.");
      return;
    }

    const savedDate = form.date;

    setEntries((prev) => {
      const existingEntry = prev.find((entry) => entry.date === form.date);

      const newEntry: DailyEntry = {
        id: existingEntry?.id ?? crypto.randomUUID(),
        date: form.date,
        diary: form.diary,
        income,
        workHours,
        mood: form.mood,
        note: form.note,
        createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
      };

      const withoutSameDate = prev.filter((entry) => entry.date !== form.date);
      return [...withoutSameDate, newEntry];
    });

    setForm({
      date: getToday(),
      diary: "",
      income: "",
      workHours: "",
      mood: "normal",
      note: "",
    });

  setEditingDate(null);
  setSelectedDate(savedDate);
  setPage("home");
  }

  function editEntry(entry: DailyEntry) {
  setForm({
    date: entry.date,
    diary: entry.diary,
    income: String(entry.income),
    workHours: String(entry.workHours),
    mood: entry.mood,
    note: entry.note,
  });

  setSelectedDate(entry.date);
  setEditingDate(entry.date);
  setPage("entry");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

  function deleteEntry(id: string) {
    const confirmed = confirm("Bạn có chắc muốn xóa nhật ký này không?");
    if (!confirmed) return;

    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function completeCurrentGoal() {
  const confirmed = confirm(
    `Bạn có chắc muốn hoàn thành mục tiêu "${goals.bigGoalName}" không?`
  );

  if (!confirmed) return;

  const completedGoal: CompletedGoal = {
    id: crypto.randomUUID(),
    name: goals.bigGoalName,
    target: goals.bigGoalTarget,
    saved: totalSavedForBigGoal,
    deadline: goals.bigGoalDeadline,
    completedAt: getToday(),
  };

  setCompletedGoals((prev) => [completedGoal, ...prev]);

  setGoals((prev) => ({
    ...prev,
    bigGoalName: "Mục tiêu mới",
    bigGoalTarget: 0,
    bigGoalSaved: 0,
    bigGoalDeadline: getToday(),
  }));

  setGoalScreen("completed");
}
  function deleteCompletedGoal(id: string) {
  const confirmed = confirm("Bạn có chắc muốn xóa mục tiêu đã hoàn thành này không?");

  if (!confirmed) return;

  setCompletedGoals((prev) => prev.filter((goal) => goal.id !== id));
}

  async function loadCloudData(userId: string) {
  setSyncStatus("Đang tải dữ liệu cloud...");

  const { data, error } = await supabase
    .from("money_diary_state")
    .select("entries, goals, completed_goals")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    setSyncStatus("Lỗi tải dữ liệu cloud");
    return;
  }

  if (data) {
    setEntries((data.entries || []) as unknown as DailyEntry[]);
    setCompletedGoals((data.completed_goals || []) as unknown as CompletedGoal[]);

    setGoals({
      ...defaultGoals,
      ...((data.goals || {}) as unknown as Goals),
    });

  } else {
    const { error: insertError } = await supabase
      .from("money_diary_state")
      .insert({
        user_id: userId,
        entries,
        goals,
        completed_goals: completedGoals,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(insertError);
      setSyncStatus("Lỗi tạo dữ liệu cloud");
      return;
    }
  }

  setCloudLoaded(true);
  setSyncStatus("Đã đồng bộ");
}

  function updateGoal(key: keyof Goals, value: string) {
    const textFields: Array<keyof Goals> = ["bigGoalName", "bigGoalDeadline"];

    setGoals((prev) => ({
      ...prev,
      [key]: textFields.includes(key) ? value : Number(value),
    }));
  }

async function handleSignUp() {
  const email = authEmail.trim();
  const password = authPassword.trim();

  if (!email || !password) {
    alert("Bạn chưa nhập email hoặc mật khẩu.");
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert(
    "Đăng ký thành công. Nếu Supabase yêu cầu xác nhận email, hãy mở email để xác nhận."
  );
}

async function handleLogin() {
  const email = authEmail.trim();
  const password = authPassword.trim();

  if (!email || !password) {
    alert("Bạn chưa nhập email hoặc mật khẩu.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }
}

async function handleLogout() {
  await supabase.auth.signOut();

  setSession(null);
  setCloudLoaded(false);
  setSyncStatus("Chưa đồng bộ");
}

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-3xl font-bold">Nhật ký kiếm tiền</h1>
          <p className="mt-1 text-slate-500">
            Ghi lại mỗi ngày, theo dõi tiền kiếm được, giờ làm và tiến độ mục tiêu.
          </p>
        </div>
      </header>

{!session && (
  <main className="mx-auto max-w-md px-4 py-8">
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold">Đăng nhập để đồng bộ</h2>

      <p className="mt-2 text-sm text-slate-500">
        Dùng cùng một tài khoản trên laptop và điện thoại để dữ liệu tự đồng bộ.
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
)}

{session && (
  <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
  <div>
    <p className="text-sm text-slate-500">Tài khoản</p>
    <p className="font-bold">{session.user.email}</p>
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
      {syncStatus}
    </span>

    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
    >
      Đăng xuất
    </button>
  </div>
</section>
  {page === "home" && (
    <>
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {isSelectedToday ? "Mục tiêu hôm nay" : "Mục tiêu ngày đang xem"}
            </h2>
            <p className="text-sm text-slate-500">
              Ngày:{" "}
              <strong>
                {isSelectedToday ? "Hôm nay" : formatDateShort(selectedDate)}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousDay}
              className="rounded-xl border bg-white px-4 py-2 text-lg font-bold shadow-sm hover:bg-slate-100"
            >
              {"<"}
            </button>

            <button
              type="button"
              onClick={goToNextDay}
              disabled={isSelectedToday}
              className={`rounded-xl border bg-white px-4 py-2 text-lg font-bold shadow-sm ${
                isSelectedToday
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              {">"}
            </button>

            <button
              type="button"
              onClick={goToToday}
              disabled={isSelectedToday}
              className={`rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm ${
                isSelectedToday
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              Hôm nay
            </button>

            <input
              type="date"
              value={selectedDate}
              max={todayString}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="rounded-xl border bg-white px-4 py-2 text-sm shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title={isSelectedToday ? "Tiền hôm nay" : "Tiền ngày này"}
            value={formatMoney(selectedIncome)}
            target={formatMoney(goals.dailyIncome)}
            progress={getProgress(selectedIncome, goals.dailyIncome)}
          />

          <StatCard
            title={isSelectedToday ? "Giờ làm hôm nay" : "Giờ làm ngày này"}
            value={`${selectedHours} giờ`}
            target={`${goals.dailyHours} giờ`}
            progress={getProgress(selectedHours, goals.dailyHours)}
          />

          <StatCard
            title={isSelectedToday ? "Tiền tuần này" : "Tiền tuần đang xem"}
            value={formatMoney(weekIncome)}
            target={formatMoney(goals.weeklyIncome)}
            progress={getProgress(weekIncome, goals.weeklyIncome)}
          />

          <StatCard
            title={isSelectedToday ? "Tiền tháng này" : "Tiền tháng đang xem"}
            value={formatMoney(monthIncome)}
            target={formatMoney(goals.monthlyIncome)}
            progress={getProgress(monthIncome, goals.monthlyIncome)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => {setPage("goals");
                          setGoalScreen("menu");}
          }
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">🎯</p>
          <h3 className="mt-3 text-xl font-bold">Các mục tiêu</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem mục tiêu lớn, mục tiêu ngày, tuần và tháng.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPage("entry")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">📝</p>
          <h3 className="mt-3 text-xl font-bold">Ghi nhật kí</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ghi lại hôm nay làm gì, kiếm được bao nhiêu và làm mấy giờ.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPage("history")}
          className="rounded-2xl bg-white p-6 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-3xl">📚</p>
          <h3 className="mt-3 text-xl font-bold">Lịch sử nhật kí</h3>
          <p className="mt-1 text-sm text-slate-500">
            Xem lại, sửa hoặc xóa các ngày đã ghi.
          </p>
        </button>
      </section>
    </>
  )}

{page === "goals" && (
  <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Các mục tiêu</h2>
        <p className="text-sm text-slate-500">
          Quản lý mục tiêu hiện tại và xem lại các mục tiêu đã hoàn thành.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setPage("home");
          setGoalScreen("menu");
        }}
        className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
      >
        Về trang chủ
      </button>
    </div>

    {goalScreen === "menu" && (
      <section className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setGoalScreen("current")}
          className="rounded-2xl bg-white p-8 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-4xl">🎯</p>

          <h3 className="mt-4 text-2xl font-bold">Mục tiêu hiện tại</h3>

          <p className="mt-2 text-sm text-slate-500">
            Xem và chỉnh sửa mục tiêu lớn, mục tiêu ngày, tuần và tháng.
          </p>

          <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm">
            <p>
              Mục tiêu: <strong>{goals.bigGoalName}</strong>
            </p>

            <p className="mt-1">
              Đã có: <strong>{formatMoney(totalSavedForBigGoal)}</strong>
            </p>

            <p className="mt-1">
              Còn thiếu: <strong>{formatMoney(remainingBigGoal)}</strong>
            </p>

            <ProgressBar value={bigGoalProgress} />

            <p className="mt-2 font-medium">
              Hoàn thành {bigGoalProgress}%
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setGoalScreen("completed")}
          className="rounded-2xl bg-white p-8 text-left shadow-sm hover:bg-slate-50"
        >
          <p className="text-4xl">🏆</p>

          <h3 className="mt-4 text-2xl font-bold">
            Các mục tiêu đã hoàn thành
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Xem lại những mục tiêu bạn đã hoàn thành trong quá khứ.
          </p>

          <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm">
            <p>
              Đã hoàn thành:{" "}
              <strong>{completedGoals.length}</strong> mục tiêu
            </p>

            <p className="mt-1">
              Gần nhất:{" "}
              <strong>
                {completedGoals[0]?.name ?? "Chưa có mục tiêu nào"}
              </strong>
            </p>
          </div>
        </button>
      </section>
    )}

    {goalScreen === "current" && (
      <>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGoalScreen("menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={completeCurrentGoal}
            className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-green-700"
          >
            Hoàn thành mục tiêu
          </button>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Biểu đồ 7 ngày gần nhất</h2>
                <p className="text-sm text-slate-500">
                  Theo dõi tiền kiếm được từng ngày.
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm">
                Tiền / giờ tháng này:{" "}
                <strong>{formatMoney(incomePerHour)}</strong>
              </div>
            </div>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot
                    name="Thu nhập"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Mục tiêu lớn</h2>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium">Tên mục tiêu</label>
                <input
                  value={goals.bigGoalName}
                  onChange={(e) => updateGoal("bigGoalName", e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Số tiền cần đạt</label>
                <input
                  type="number"
                  value={goals.bigGoalTarget}
                  onChange={(e) => updateGoal("bigGoalTarget", e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Số tiền đã có sẵn</label>
                <input
                  type="number"
                  value={goals.bigGoalSaved}
                  onChange={(e) => updateGoal("bigGoalSaved", e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Hạn mục tiêu</label>
                <input
                  type="date"
                  value={goals.bigGoalDeadline}
                  onChange={(e) =>
                    updateGoal("bigGoalDeadline", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-100 p-4">
              <p className="font-bold">{goals.bigGoalName}</p>

              <p className="mt-2 text-sm">
                Đã có: <strong>{formatMoney(totalSavedForBigGoal)}</strong>
              </p>

              <p className="mt-1 text-sm">
                Còn thiếu: <strong>{formatMoney(remainingBigGoal)}</strong>
              </p>

              <p className="mt-1 text-sm">
                Còn lại: <strong>{daysLeft} ngày</strong>
              </p>

              <p className="mt-1 text-sm">
                Cần mỗi ngày: <strong>{formatMoney(needPerDay)}</strong>
              </p>

              <ProgressBar value={bigGoalProgress} />

              <p className="mt-2 text-sm font-medium">
                Hoàn thành {bigGoalProgress}%
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Mục tiêu ngày / tuần / tháng</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tiền / ngày</label>
              <input
                type="number"
                value={goals.dailyIncome}
                onChange={(e) => updateGoal("dailyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / ngày</label>
              <input
                type="number"
                value={goals.dailyHours}
                onChange={(e) => updateGoal("dailyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tiền / tuần</label>
              <input
                type="number"
                value={goals.weeklyIncome}
                onChange={(e) => updateGoal("weeklyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / tuần</label>
              <input
                type="number"
                value={goals.weeklyHours}
                onChange={(e) => updateGoal("weeklyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tiền / tháng</label>
              <input
                type="number"
                value={goals.monthlyIncome}
                onChange={(e) => updateGoal("monthlyIncome", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Giờ làm / tháng</label>
              <input
                type="number"
                value={goals.monthlyHours}
                onChange={(e) => updateGoal("monthlyHours", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </div>
          </div>
        </section>
      </>
    )}

    {goalScreen === "completed" && (
      <>
        <div>
          <button
            type="button"
            onClick={() => setGoalScreen("menu")}
            className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
          >
            Quay lại
          </button>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Các mục tiêu đã hoàn thành</h2>

          {completedGoals.length === 0 ? (
            <p className="mt-4 text-slate-500">
              Bạn chưa hoàn thành mục tiêu nào.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {completedGoals.map((goal) => (
                <article key={goal.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{goal.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Hoàn thành ngày: {goal.completedAt}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                        Đã hoàn thành
                      </span>

                      <button
                        type="button"
                        onClick={() => deleteCompletedGoal(goal.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Mục tiêu</p>
                      <p className="font-bold">{formatMoney(goal.target)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Đã có khi hoàn thành</p>
                      <p className="font-bold">{formatMoney(goal.saved)}</p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3">
                      <p className="text-slate-500">Hạn mục tiêu</p>
                      <p className="font-bold">{goal.deadline}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </>
    )}
  </>
)}

  {page === "entry" && (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {editingDate ? "Sửa nhật kí" : "Ghi nhật kí"}
          </h2>
          <p className="text-sm text-slate-500">
            Ghi lại một ngày của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPage("home")}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Về trang chủ
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 className="text-xl font-bold">
          {editingDate ? `Sửa nhật ký ngày ${editingDate}` : "Ghi nhật ký hôm nay"}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Ngày</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tâm trạng</label>
            <select
              value={form.mood}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  mood: e.target.value as Mood,
                }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value="good">Vui</option>
              <option value="normal">Bình thường</option>
              <option value="tired">Mệt</option>
              <option value="bad">Tệ</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Tiền kiếm được</label>
            <input
              type="number"
              placeholder="VD: 250000"
              value={form.income}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, income: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Số giờ làm việc</label>
            <input
              type="number"
              step="0.5"
              placeholder="VD: 4"
              value={form.workHours}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, workHours: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">
            Hôm nay mình đã làm gì?
          </label>
          <textarea
            rows={4}
            value={form.diary}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, diary: e.target.value }))
            }
            placeholder="VD: Hôm nay chạy đơn buổi sáng, hơi mệt nhưng vẫn cố hoàn thành..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Ghi chú thêm</label>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="VD: Mai cần dậy sớm hơn, tối ưu khung giờ làm việc..."
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
          >
            {editingDate ? "Cập nhật nhật ký" : "Lưu nhật ký"}
          </button>

          {editingDate && (
            <button
              type="button"
              onClick={() => {
                setEditingDate(null);
                setForm({
                  date: getToday(),
                  diary: "",
                  income: "",
                  workHours: "",
                  mood: "normal",
                  note: "",
                });
              }}
              className="rounded-xl border bg-white px-5 py-2 font-medium hover:bg-slate-100"
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>
    </>
  )}

  {page === "history" && (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử nhật kí</h2>
          <p className="text-sm text-slate-500">
            Xem lại, sửa hoặc xóa các ngày đã ghi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPage("home")}
          className="rounded-xl border bg-white px-4 py-2 font-medium shadow-sm hover:bg-slate-100"
        >
          Về trang chủ
        </button>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        {sortedEntries.length === 0 ? (
          <p className="text-slate-500">
            Chưa có nhật ký nào. Hãy nhập ngày đầu tiên của bạn.
          </p>
        ) : (
          <div className="grid gap-3">
            {sortedEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{entry.date}</h3>
                    <p className="text-sm text-slate-500">
                      {formatMoney(entry.income)} · {entry.workHours} giờ ·{" "}
                      {moodLabels[entry.mood]}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editEntry(entry)}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Sửa
                    </button>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                {entry.diary && (
                  <p className="mt-3 whitespace-pre-line">{entry.diary}</p>
                )}

                {entry.note && (
                  <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                    {entry.note}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )}
</main>
)}
    </div>
  );
}