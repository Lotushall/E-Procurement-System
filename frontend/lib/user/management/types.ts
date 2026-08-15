export type UserType = "internal" | "company" | "individual";
export type UserStatus = "pending" | "active" | "suspended" | "inactive";
export type UserSortBy = "created_at" | "username" | "email";
export type UserSortDirection = "asc" | "desc";

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
}

export interface UserListPagination {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PaginatedUserList {
  data: UserListItem[];
  meta: UserListPagination;
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
  prefix?: string;
  firstname: string;
  lastname: string;
  employeeNo?: string;
  department?: string;
  position?: string;
  phone?: string;
}

export interface UpdateAccountPayload {
  username: string;
  email: string;
  password?: string;
}

export interface UpdateInternalUserPayload extends UpdateAccountPayload {
  role: string;
  prefix?: string;
  firstname: string;
  lastname: string;
  employeeNo?: string;
  department?: string;
  position?: string;
  phone?: string;
}

export type UpdateUserPayload = UpdateAccountPayload | UpdateInternalUserPayload;
