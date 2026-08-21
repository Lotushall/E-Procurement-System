"use client";

import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function InternalProfilesPage() {
    return (
        <Suspense fallback={"loading..."}>
            <InternalProfilesPageContent />
        </Suspense>
    );
}

function InternalProfilesPageContent() {

    useBreadcrumb([{ label: "พนักงานภายใน" }]);

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">จัดการพนักงานภายใน</h1>
                    <p className="text-sm text-gray-600 tracking-wide">
                        รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
                    </p>
                </div>
                <div className="flex items-center gap-2">

                    <Button variant="outline" render={<Link href={routes.dashboards.user.roles} />} nativeButton={false} className="h-10">
                        จัดการ แผนก และ ตำแหน่ง
                    </Button>

                    <Button
                        render={<Link href={routes.dashboards.internal_employees.create} />}
                        nativeButton={false}
                        className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-700 h-10"
                    >
                        <Plus />
                        <p>เพิ่มพนักงาน</p>
                    </Button>
                </div>
            </div>
        </div>
    )
}
