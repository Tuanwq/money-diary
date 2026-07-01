export function getBalanceStatus(difference: number) {
  if (difference === 0) return "Khớp số dư";
  if (difference < 0) return "Hao hụt";
  return "Dư tiền";
}

export function getBalanceStatusClass(difference: number) {
  if (difference === 0) return "bg-green-50 text-green-700";
  if (difference < 0) return "bg-red-50 text-red-600";
  return "bg-yellow-50 text-yellow-700";
}
