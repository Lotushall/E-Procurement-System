import type { VendorDetail } from "@/lib/vendor/approval/types";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import { makeVendorProfile } from "@/tests/fixtures/vendor-profile";

// แถวในรายการผู้ค้า (GET /api/v1/vendors) ใช้ชนิด VendorProfile เดียวกับ vendor self-service
export function makeVendorListItem(overrides: Partial<VendorProfile> = {}): VendorProfile {
  return { ...makeVendorProfile(), ...overrides };
}

// GET /api/v1/vendors/{id} = VendorProfile + ผู้ใช้เจ้าของบัญชี (VendorDetail ใน lib/vendor/approval/types.ts)
export function makeVendorDetail(overrides: Partial<VendorDetail> = {}): VendorDetail {
  return {
    ...makeVendorProfile(),
    user: { id: 10, username: "vendor01", email: "vendor01@example.com" },
    ...overrides,
  };
}
