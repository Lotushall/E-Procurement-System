import { InternalProfile } from "@/lib/internal-profiles/types";
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

export interface TenderProjects {
  id: number;
  projectCode: string;
  name: string;
  description: string;
  budget: number;
  department: string;
  personInCharge: InternalProfile;
  createdBy: User;
  procurementMethod: string;
  fiscalYear: string;
  projectStartAt: string;
  projectEndAt: string;
  status: string;
}

export interface PaginatedTenderProjectsList {
  data: TenderProjects[];
  meta: PaginationMeta;
}
