export const GROUP_LABELS: Record<string, string> = {
  vendors: "จัดการผู้ค้า",
  users: "จัดการผู้ใช้",
  tender_projects: "จัดการโครงการจัดซื้อจัดจ้าง",
  tors: "จัดการ TOR",
};

export function getGroupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}
