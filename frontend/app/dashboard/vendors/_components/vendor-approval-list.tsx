"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useVendorList } from "@/lib/vendor-approval/useVendorList";
import type { VendorVerificationStatus } from "@/lib/vendor-approval/types";
import { VendorRow } from "./vendor-row";

const TABS: { value: VendorVerificationStatus; label: string }[] = [
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธแล้ว" },
];

export function VendorApprovalList() {
  const [status, setStatus] = useState<VendorVerificationStatus>("pending");
  const { data: vendors, isPending } = useVendorList(status);

  return (
    <Tabs
      value={status}
      onValueChange={(value) => setStatus(value as VendorVerificationStatus)}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={status}>
        {isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : vendors && vendors.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vendors.map((vendor) => (
              <VendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ไม่มีรายการในสถานะนี้
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
