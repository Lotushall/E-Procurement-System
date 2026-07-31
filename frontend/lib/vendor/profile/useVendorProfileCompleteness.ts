import { useUser } from "@/lib/auth/useUser";
import { useVendorProfile } from "@/lib/vendor/profile/useVendorProfile";
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
  const { data: vendor, isPending } = useVendorProfile(user?.userType !== "internal");

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
    isLoading: isUserLoading || isPending,
    hasVertifyEmail,
    hasIncompleteAddress,
    hasIncompleteContact,
    hasIncompleteDocument,
  };
}
