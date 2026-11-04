import { useUser } from "@/lib/auth/queries/useUser";
import { useVendorProfile } from "@/lib/vendor/profile/queries/useVendorProfile";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";

export interface VendorProfileCompleteness {
  isLoading: boolean;
  hasVertifyEmail: boolean;
  hasIncompleteAddress: boolean;
  hasIncompleteContact: boolean;
  hasIncompleteDocument: boolean;
}

export function useVendorProfileCompleteness(): VendorProfileCompleteness {
  const { data: user, isLoading: isUserLoading } = useUser();
  // รอรู้ก่อนว่าเป็นผู้ค้า — ระหว่าง user ยังโหลด (undefined) ห้ามยิง vendor profile
  const isVendor = !!user && user.userType !== "internal";
  const { data: vendor, isPending } = useVendorProfile(isVendor);

  const hasVertifyEmail = !isUserLoading && !user?.emailVerifiedAt;

  const hasIncompleteAddress =
    !isPending &&
    (!vendor || !vendor.detail.address || !vendor.detail.province || !vendor.detail.postalCode);

  const hasIncompleteContact =
    !isPending &&
    (!vendor ||
      !vendor.contact ||
      vendor.contact.length === 0 ||
      !vendor.contact?.[0]?.contactName ||
      !vendor.contact?.[0]?.contactEmail ||
      !vendor.contact?.[0]?.contactPhone);

  const hasIncompleteDocument =
    !isPending &&
    (!vendor ||
      REQUIRED_DOCUMENTS[vendor.detail.type]
        .filter((doc) => doc.required)
        .some((doc) => !vendor.document?.some((d) => d.documentType === doc.key)));

  return {
    // query ที่ถูกปิด (ไม่ใช่ผู้ค้า) ค้าง pending ตลอด จึงนับเฉพาะตอนเป็นผู้ค้า
    isLoading: isUserLoading || (isVendor && isPending),
    hasVertifyEmail,
    hasIncompleteAddress,
    hasIncompleteContact,
    hasIncompleteDocument,
  };
}
