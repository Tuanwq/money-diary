export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  return { currentPage, totalPages,
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize) };
}
