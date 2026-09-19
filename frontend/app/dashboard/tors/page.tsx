"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function TorIndex() {
  useBreadcrumb([{ label: "การจัดการ TOR" }]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            ภาพรวมทั้งหมดและ TOR ที่เกี่ยวข้อง
          </p>
        </div>

        <div>

        </div>
      </div>

      <form className="flex flex-col gap-3 lg:flex-row flex-wrap">

      </form>
    </div>
  );
}
