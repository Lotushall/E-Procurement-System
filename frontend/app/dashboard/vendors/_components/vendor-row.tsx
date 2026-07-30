import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { routes } from "@/lib/routes";
import type { VendorSummary } from "@/lib/vendor-approval/types";

const VENDOR_TYPE_LABEL: Record<VendorSummary["vendorType"], string> = {
  company: "นิติบุคคล",
  individual: "บุคคลธรรมดา",
};

export function VendorRow({ vendor }: { vendor: VendorSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-bold">{vendor.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {VENDOR_TYPE_LABEL[vendor.vendorType]} · สมัครเมื่อ{" "}
          {new Date(vendor.submittedAt).toLocaleDateString("th-TH")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <VendorStatusBadge status={vendor.verificationStatus} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={routes.dashboards.vendors.detail(vendor.id)} />}
        >
          ดูรายละเอียด
        </Button>
      </div>
    </div>
  );
}
