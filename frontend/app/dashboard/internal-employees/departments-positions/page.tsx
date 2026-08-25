"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";

export default function DepartmentsPositions() {
    useBreadcrumb([
        { label: "จัดการ แผนก และ ตำแหน่ง", href: routes.dashboards.internal_employees.index },
        { label: "จัดการ Role และ Permission" },
    ]);

    return (
        <div>
            DepartmentsPositions
        </div>
    )
}
