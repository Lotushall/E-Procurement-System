import type { PaginationMeta } from "@/lib/pagination";

export type InternalProfileSortBy =
  | "employee_no"
  | "firstname"
  | "lastname"
  | "department"
  | "position";
export type InternalProfileSortDirection = "asc" | "desc";

export interface InternalProfile {
  id: number;
  userId: number;
  employeeNo: string;
  prefix: "นาย" | "นาง";
  firstname: string;
  lastname: string;
  department: Department | null;
  position: Position | null;
  phone: string;
}

export interface Department {
  id: number;
  name: string;
  internalProfilesCount?: number | null;
}

export interface Position {
  id: number;
  name: string;
  internalProfilesCount?: number | null;
}

export interface PaginatedUserList {
  data: InternalProfile[];
  meta: PaginationMeta;
}
