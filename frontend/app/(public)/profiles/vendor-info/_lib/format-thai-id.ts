export function formatThaiId(value: string): string {
  const chars = value
    .toUpperCase()
    .replace(/[^0-9X]/g, "")
    .slice(0, 13);
  return [
    chars.slice(0, 1),
    chars.slice(1, 5),
    chars.slice(5, 10),
    chars.slice(10, 12),
    chars.slice(12, 13),
  ]
    .filter(Boolean)
    .join("-");
}
