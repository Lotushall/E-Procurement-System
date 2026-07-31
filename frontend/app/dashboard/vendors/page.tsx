"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function VendorRegistrationPage() {
  useBreadcrumb([{ label: "ผู้ค้าที่ลงทะเบียน" }]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน</h1>
    </div>
  );
}
