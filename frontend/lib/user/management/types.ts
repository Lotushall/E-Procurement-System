import type { PaginationMeta } from "@/lib/pagination";

export type UserType = "internal" | "company" | "individual";
export type UserStatus = "pending" | "active" | "suspended" | "inactive";
export type UserTypeFilter = "all" | UserType;
export type UserStatusFilter = "all" | UserStatus;
export type UserSortBy = "created_at" | "username" | "email";
export type UserSortDirection = "asc" | "desc";

export interface UserListParams {
  type?: UserType;
  status?: UserStatus;
  search?: string;
  sort_by?: UserSortBy;
  sort_direction?: UserSortDirection;
}

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  name: string;
  userType: UserType;
  status: UserStatus;
  createdAt: string;
}

export interface InternalProfileFields {
  prefix: string | null;
  firstname: string;
  lastname: string;
  employeeNo: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
}

export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
  role: string | null;
  internalProfile: InternalProfileFields | null;
  permissions: string[] | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}

export interface PaginatedUserList {
  data: UserListItem[];
  meta: PaginationMeta;
}

export interface Permission {
  name: string;
  label: string;
  group: string;
}

export interface RoleDetail {
  id: number;
  name: string;
  permissions: string[];
  userCount: number;
}

export interface RoleFormPayload {
  name: string;
  permissions: string[];
}

export interface PermissionFormPayload {
  name: string;
  label: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  internalProfileId: number;
}

export interface UpdateAccountPayload {
  username: string;
  email: string;
  password?: string;
}

export interface UpdateInternalUserPayload extends UpdateAccountPayload {
  role: string;
  permissions: string[];
}

export type UpdateUserPayload =
  | UpdateAccountPayload
  | UpdateInternalUserPayload;

export interface SessionInfo {
  id: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  browser: string;
  os: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
}
