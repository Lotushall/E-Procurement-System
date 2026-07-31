import type { VendorProfile, VendorVerificationStatus } from "@/lib/vendor/profile/types";
import type { User } from "@/lib/user/types";

export type { VendorVerificationStatus };

export interface VendorSummary {
  id: number;
  displayName: string;
  vendorType: "company" | "individual";
  verificationStatus: VendorVerificationStatus;
  submittedAt: string;
}

export interface VendorDetail extends VendorProfile {
  user: Pick<User, "username" | "email">;
}
