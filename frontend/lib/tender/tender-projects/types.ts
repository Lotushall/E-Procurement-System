import { Department, InternalProfile } from "@/lib/internal-profiles/types";
import { PaginationMeta } from "@/lib/pagination";
import type { Tor } from "@/lib/tender/tor/types";
import { User } from "@/lib/user/types";

export type TenderProjectSortBy = "project_code" | "name" | "budget";
export type TenderProjectSortDirection = "asc" | "desc";

export type TenderProjectStatusFilter = "all" | TenderProjectStatus;

export type TenderProjectStatus =
  | "draft"
  | "published"
  | "closed"
  | "completed"
  | "cancelled"
  | "archived";

export interface TenderProjects {
  id: number;
  projectCode: string;
  name: string;
  // TenderProjectResource ตัด key ทิ้งเมื่อค่าเป็น null (whenNotNull) หรือไม่ได้ eager-load relation (whenLoaded)
  // และ person_in_charge_id เป็น nullable จึงอาจได้ null มาตรง ๆ เมื่อ load แล้วแต่ไม่มีผู้รับผิดชอบ
  description?: string;
  budget: string;
  department?: Pick<Department, "id" | "name">;
  personInCharge?: InternalProfile | null;
  createdBy?: User;
  procurementMethod: string;
  fiscalYear: number;
  projectStartAt?: string;
  projectEndAt?: string;
  status: TenderProjectStatus;
  // ยอดจัดสรร: ผลรวมราคากลางของ TOR ที่ไม่ถูกยกเลิก นับทุก TOR ไม่ขึ้นกับสิทธิ์ผู้ดู (ต่างจาก torsCount / tors)
  allocatedBudget: string;
  // มีเฉพาะใน GET /tender-projects (รายการ) — นับเฉพาะ TOR ที่ผู้ใช้ดูได้ (TorPolicy)
  torsCount?: number;
  // มีเฉพาะใน GET /tender-projects/{id} — backend กรองเหลือแค่ TOR ที่ผู้ใช้ดูได้ (TorPolicy) เรียงตาม torCode
  tors?: TenderProjectTor[];
}

export type TenderProjectTor = Pick<
  Tor,
  "id" | "torCode" | "title" | "procurementMethod" | "budgetEstimate" | "biddingStartAt" | "biddingEndAt" | "status"
>;

export interface TenderProjectListParams {
  search?: string;
  status?: TenderProjectStatus;
  department_id?: number;
  fiscal_year?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: TenderProjectSortBy;
  sort_direction?: TenderProjectSortDirection;
}

interface TenderProjectStats {
  stats: {
    totalCount: number;
    totalBudget: number;
    inProgressCount: number;
    completedCount: number;
  };
}

export interface PaginatedTenderProjectsList {
  data: TenderProjects[];
  meta: PaginationMeta & TenderProjectStats;
}

export interface CreateTenderProjectPayload {
  name: string;
  description?: string;
  budget: number;
  departmentId: number;
  personInChargeId?: number;
  procurementMethod: string;
  fiscalYear: number;
  projectStartAt?: string;
  projectEndAt?: string;
}

export interface UpdateTenderProjectPayload {
  name: string;
  description?: string;
  budget: number;
  departmentId: number;
  personInChargeId?: number;
  procurementMethod: string;
  fiscalYear: number;
  projectStartAt?: string;
  projectEndAt?: string;
}

// ตัวเลือกใน dropdown โครงการ (GET /dashboard/tender-projects/select)
export interface TenderProjectOption {
  id: number;
  projectCode: string;
  name: string;
}
