import { Department } from "@/lib/internal-profiles/types";
import { PaginationMeta } from "@/lib/pagination";

export type TorSortBy =
  | "tor_code"
  | "title"
  | "budget_estimate"
  | "fiscal_year"
  | "bidding_end_at"
  | "created_at";
export type TorSortDirection = "asc" | "desc";

export type TorStatusFilter = "all" | TorStatus;

export type TorStatus =
  | "draft"
  | "in_review"
  | "revision_required"
  | "approved"
  | "bidding"
  | "closed"
  | "no_bidder"
  | "awarded"
  | "completed"
  | "cancelled";

export interface TorUserSummary {
  id: number;
  name: string | null;
  department: Pick<Department, "id" | "name"> | null;
}

export interface Tor {
  id: number;
  torCode: string;
  title: string;
  scopeOfWork: string;
  budgetEstimate: string;
  procurementMethod: string;
  fiscalYear: number;
  biddingStartAt: string | null;
  biddingEndAt: string | null;
  status: TorStatus;
  remark: string | null;
  approvedAt: string | null;
  createdAt: string;
  department: Pick<Department, "id" | "name">;
  tenderProject: { id: number; projectCode: string; name: string } | null;
  createdBy: TorUserSummary | null;
  approvedBy: TorUserSummary | null;
}

export interface TorListParams {
  search?: string;
  status?: TorStatus;
  department_id?: number;
  fiscal_year?: number;
  // "none" = TOR ที่ไม่สังกัดโครงการใด
  tender_project_id?: number | "none";
  procurement_method?: string;
  sort_by?: TorSortBy;
  sort_direction?: TorSortDirection;
}

export interface PaginatedTorsList {
  data: Tor[];
  meta: PaginationMeta;
}

// มีสิทธิ์ตัวใดตัวหนึ่งก็ดูหน้า TOR ได้ — ชุดเดียวกับที่ backend เช็คใน TorPolicy::viewAny
export const TOR_VIEW_PERMISSIONS = ["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"];
