"use client";

import { VendorApprovalList } from "./_components/vendor-approval-list";

export default function VendorApprovalPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">อนุมัติผู้ขาย</h1>
      <VendorApprovalList />
    </div>
  );
}
