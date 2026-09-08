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
  description: string;
  budget: string;
  department: Pick<Department, "id" | "name">;
  personInCharge: InternalProfile;
  createdBy: User;
  procurementMethod: string;
  fiscalYear: string;
  projectStartAt: string;
  projectEndAt: string;
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
