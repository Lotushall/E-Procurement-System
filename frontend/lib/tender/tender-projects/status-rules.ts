import type { TenderProjectStatus } from "./types";

// ผู้ที่มีสิทธิ์นี้เปลี่ยนสถานะได้ทุกแบบ และยังแก้ไข/ลบโครงการที่จบแล้วได้ (ตรงกับ TenderProjectPolicy::manageAnyStatus)
export const MANAGE_ANY_STATUS_PERMISSION = "tender_projects.manageAnyStatus";

// ไม่มีสิทธิ์ข้างบน เปลี่ยนสถานะได้ทีละขั้นตาม flow นี้เท่านั้น (ตรงกับ TenderProject::canMoveForwardTo)
// backend บังคับกฎเดียวกัน ฝั่งนี้แค่ไม่เสนอทางเลือกที่ backend จะปฏิเสธ
export const TENDER_PROJECT_STATUS_TRANSITIONS: Record<TenderProjectStatus, TenderProjectStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["closed", "cancelled"],
  closed: ["completed", "cancelled"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

// โครงการที่จบแล้ว ไม่มีสิทธิ์ข้างบนจะแก้ไขหรือลบไม่ได้ (ตรงกับ TenderProject::isEditable)
const LOCKED_STATUSES: TenderProjectStatus[] = ["completed", "cancelled", "archived"];

export function allowedNextStatuses(status: TenderProjectStatus, canManageAnyStatus: boolean): TenderProjectStatus[] {
  return canManageAnyStatus
    ? (Object.keys(TENDER_PROJECT_STATUS_TRANSITIONS) as TenderProjectStatus[]).filter((next) => next !== status)
    : TENDER_PROJECT_STATUS_TRANSITIONS[status];
}

export function isTenderProjectLocked(status: TenderProjectStatus, canManageAnyStatus: boolean): boolean {
  return !canManageAnyStatus && LOCKED_STATUSES.includes(status);
}
