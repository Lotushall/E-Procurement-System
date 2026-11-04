import type { TenderProjectStatus } from "./types";

// ผู้ที่ไม่ใช่ admin เปลี่ยนสถานะได้ทีละขั้นตาม flow นี้เท่านั้น — admin เปลี่ยนเป็นสถานะไหนก็ได้
// backend ต้องบังคับกฎเดียวกัน ฝั่งนี้แค่ไม่เสนอทางเลือกที่ backend จะปฏิเสธ
export const TENDER_PROJECT_STATUS_TRANSITIONS: Record<TenderProjectStatus, TenderProjectStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["closed", "cancelled"],
  closed: ["completed", "cancelled"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

// โครงการที่จบแล้ว ผู้ที่ไม่ใช่ admin แก้ไขหรือลบไม่ได้
const LOCKED_STATUSES: TenderProjectStatus[] = ["completed", "cancelled", "archived"];

export function allowedNextStatuses(status: TenderProjectStatus, isAdmin: boolean): TenderProjectStatus[] {
  return isAdmin
    ? (Object.keys(TENDER_PROJECT_STATUS_TRANSITIONS) as TenderProjectStatus[]).filter((next) => next !== status)
    : TENDER_PROJECT_STATUS_TRANSITIONS[status];
}

export function isTenderProjectLocked(status: TenderProjectStatus, isAdmin: boolean): boolean {
  return !isAdmin && LOCKED_STATUSES.includes(status);
}
