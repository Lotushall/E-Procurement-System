import { User } from "../user/types";
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
  user: User;
  employee_no: string;
  prefix: "นาย" | "นาง";
  firstname: string;
  lastname: string;
  department: Department;
  position: Position;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUserList {
  data: InternalProfile[];
  meta: PaginationMeta;
}
