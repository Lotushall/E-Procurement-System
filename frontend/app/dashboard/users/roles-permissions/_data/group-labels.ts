export const GROUP_LABELS: Record<string, string> = {
  vendors: "ผู้ค้า",
  users: "ผู้ใช้",
  roles: "Role/สิทธิ์",
};

export function getGroupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}
