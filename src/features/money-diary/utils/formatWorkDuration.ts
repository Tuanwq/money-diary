export function formatWorkDuration(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "0 giờ";

  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours === 0) return `${minutes} phút`;
  if (minutes === 0) return `${wholeHours} giờ`;

  return `${wholeHours} giờ ${minutes} phút`;
}
