"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function TorIndex() {
  useBreadcrumb([{ label: "การจัดการ TOR" }]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
    </div>
  );
}
