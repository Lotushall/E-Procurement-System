import type {
  VendorProfile,
  VendorVerificationStatus,
} from "@/lib/vendor/profile/types";
import type { User } from "@/lib/user/types";

export type { VendorVerificationStatus };

export interface VendorStatusCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface VendorListPagination {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export type VendorSortBy =
  | "created_at"
  | "verification_status"
  | "user_type"
  | "business_type"
  | "name";

export type VendorSortDirection = "asc" | "desc";

export interface VendorDetail extends VendorProfile {
  user: Pick<User, "id" | "username" | "email">;
}
