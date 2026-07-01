export function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export function parseMoneyInput(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

export function formatMoneyInput(value: string) {
  const onlyDigits = value.replace(/[^\d]/g, "");

  if (!onlyDigits) return "";

  return new Intl.NumberFormat("vi-VN").format(Number(onlyDigits));
}
