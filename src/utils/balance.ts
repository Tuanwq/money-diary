export function getBalanceStatus(difference: number) {
  if (difference === 0) return "Khớp số dư";
  if (difference < 0) return "Thực tế thiếu";
  return "Thực tế dư";
}

export function getBalanceStatusClass(difference: number) {
  if (difference === 0) return "bg-green-50 text-green-700";
  if (difference < 0) return "bg-amber-50 text-amber-700";
  return "bg-sky-50 text-sky-700";
}
