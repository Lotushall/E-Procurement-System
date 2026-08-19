"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function InternalEmployeesPage() {
    useBreadcrumb([{ label: "พนักงานภายใน" }]);
    return (
        <div>
            InternalEmployeesPage
        </div>
    )
}
