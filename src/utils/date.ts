export function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getToday() {
  return getDateString();
}

export function toDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

export function isSameMonth(dateString: string, now = new Date()) {
  const date = toDate(dateString);
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function isThisWeek(dateString: string, now = new Date()) {
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

export function formatDateShort(dateString: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(toDate(dateString));
}

export function formatReportDate(dateString?: string) {
  if (!dateString) return "Không có";

  const date = dateString.includes("T") ? new Date(dateString) : toDate(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

export function getDaysLeft(deadline: string) {
  if (!deadline) return 0;

  const today = toDate(getToday());
  const targetDate = toDate(deadline);
  const diffTime = targetDate.getTime() - today.getTime();

  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
}

export function isDateInRange(date: string, fromDate: string, toDate: string) {
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

export function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function addDaysToDateString(dateString: string, days: number) {
  const date = toDate(dateString);
  date.setDate(date.getDate() + days);

  return getDateString(date);
}

export function getMonthStart() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}
