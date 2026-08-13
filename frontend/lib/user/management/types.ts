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

export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
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
