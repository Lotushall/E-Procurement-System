import { Department, InternalProfile } from "@/lib/internal-profiles/types";
import { PaginationMeta } from "@/lib/pagination";
import { User } from "@/lib/user/types";

export type TenderProjectSortBy =
  | "projectCode"
  | "name"
  | "budget"
  | "department"
  | "personInCharge"
  | "createdBy"
  | "procurementMethod"
  | "fiscalYear"
  | "projectStartAt"
  | "projectEndAt"
  | "status";
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
