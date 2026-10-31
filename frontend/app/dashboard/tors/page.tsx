"use client";

import { Suspense } from "react";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { DataTable } from "@/components/ui/data-table";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useTenderProjectOptions } from "@/lib/tender/tender-projects/queries/useTenderProjectOptions";
import { TOR_VIEW_PERMISSIONS } from "@/lib/tender/tor/types";
import { useTorListPage } from "./_hooks/use-tor-list-page";
import { TorListSkeleton, TorTableSkeleton } from "./_components/tor-list-skeleton";
import { TorFilterBar } from "./_components/filters/tor-filter-bar";
import { torColumns } from "./_components/table/columns";
import { TorCard } from "./_components/table/tor-card";

function TorsPageContent() {
    useBreadcrumb([{ label: "การจัดการ TOR" }]);

    // โหลดไม่ได้ = dropdown เหลือแค่ตัวเลือกคงที่ ("ทุกหน่วยงาน" / "ทุกโครงการ", "ไม่สังกัดโครงการ")
    const { data: departmentOptions } = useDepartmentOptions();
    const { data: tenderProjectOptions } = useTenderProjectOptions();

    const {
        search,
        setSearch,
        status,
        setStatus,
        departmentId,
        setDepartmentId,
        fiscalYear,
        setFiscalYear,
        procurementMethod,
        setProcurementMethod,
        tenderProjectId,
        setTenderProjectId,
        sort,
        setSort,
        submitFilters,
        clearFilters,
        appliedSearch,
        activeFilterCount,
        visible,
        pageCount,
        total,
        pagination,
        setPagination,
        sorting,
        setSorting,
        isPending,
        isFetching,
        isError,
    } = useTorListPage();

    return (
        <div className="flex flex-col gap-5">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
                <p className="text-sm text-gray-600 tracking-wide">
                    ภาพรวมทั้งหมดและ TOR ที่เกี่ยวข้อง
                </p>
            </div>

            <TorFilterBar
                departments={departmentOptions ?? []}
                tenderProjects={tenderProjectOptions ?? []}
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                departmentId={departmentId}
                setDepartmentId={setDepartmentId}
                fiscalYear={fiscalYear}
                setFiscalYear={setFiscalYear}
                procurementMethod={procurementMethod}
                setProcurementMethod={setProcurementMethod}
                tenderProjectId={tenderProjectId}
                setTenderProjectId={setTenderProjectId}
                sort={sort}
                setSort={setSort}
                activeFilterCount={activeFilterCount}
                onSubmit={submitFilters}
                onClear={clearFilters}
            />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูล TOR ได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : isPending || isFetching ? (
                <TorTableSkeleton />
            ) : visible.length > 0 ? (
                <DataTable
                    columns={torColumns}
                    data={visible}
                    pageCount={pageCount}
                    total={total}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    renderMobileCard={(tor) => <TorCard tor={tor} />}
                />
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {appliedSearch
                        ? "ไม่พบ TOR ที่ตรงกับคำค้นหา"
                        : activeFilterCount > 0
                            ? "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"
                            : "ยังไม่มี TOR ในระบบ"
                    }
                </p>
            )}
        </div>
    );
}

export default function TorsPage() {
    return (
        <Suspense fallback={<TorListSkeleton />}>
            <RequirePermission permissions={TOR_VIEW_PERMISSIONS}>
                <TorsPageContent />
            </RequirePermission>
        </Suspense>
    );
}
