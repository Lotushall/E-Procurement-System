"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { Suspense } from "react";

function TenderProjectsPageContent() {
    useBreadcrumb([{ label: "จัดการ Tender Projects" }]);

    return (
        <>
        </>
    );
}

export default function TenderProjectsPage() {
    return (
        <Suspense fallback={"loading..."}>
            <TenderProjectsPageContent />
        </Suspense>
    )
}
