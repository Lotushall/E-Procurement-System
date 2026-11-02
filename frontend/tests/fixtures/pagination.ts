// รูปแบบ response แบบแบ่งหน้าของ backend: { data: [...], meta: { currentPage, lastPage, perPage, total, ... } }
export function paginated<T>(data: T[], meta: Record<string, unknown> = {}) {
  return {
    data,
    meta: {
      currentPage: 1,
      lastPage: 1,
      perPage: 20,
      total: data.length,
      ...meta,
    },
  };
}
