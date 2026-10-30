"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { Suspense, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useAuthPermissions } from "@/lib/auth/permissions";
import { useTenderProjectListPage } from "./_hooks/use-tender-project-list-page";
import { TenderProjectStatsCards } from "./_components/tender-project-stats-cards";
import {
    TenderProjectListSkeleton,
    TenderProjectTableSkeleton,
} from "./_components/tender-project-list-skeleton";
import { CreateTenderProjectDialog } from "./_components/dialogs/create-tender-project-dialog";
import { TenderProjectFilterBar } from "./_components/filters/tender-project-filter-bar";
import { createColumns } from "./_components/table/columns";
import { TenderProjectCard } from "./_components/table/tender-project-card";

function TenderProjectsPageContent() {
    useBreadcrumb([{ label: "จัดการโครงการจัดซื้อจัดจ้าง" }]);

    const { hasPermission } = useAuthPermissions();
    const canUpdateStatus = hasPermission("tender_projects.updateStatus");

    const columns = useMemo(
        () => createColumns(canUpdateStatus),
        [canUpdateStatus],
    );

    const { data: departmentOptions } = useDepartmentOptions();

    const {
        search,
        setSearch,
        status,
        setStatus,
        departmentId,
        setDepartmentId,
        fiscalYear,
        setFiscalYear,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        sort,
        setSort,
        submitFilters,
        clearFilters,
        appliedSearch,
        activeFilterCount,
        stats,
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
    } = useTenderProjectListPage();

    return (
        // pb-36: เว้นที่ให้ปุ่มสร้างแบบลอย + ScrollToTop ที่ซ้อนอยู่เหนือมัน ไม่ให้บัง pagination / การ์ดใบสุดท้าย
        <div className="flex flex-col gap-5 pb-36">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">จัดการโครงการจัดซื้อจัดจ้าง</h1>
                <p className="text-sm text-gray-600 tracking-wide">
                    ภาพรวมโครงการทั้งหมดและ TOR ที่เกี่ยวข้อง
                </p>
            </div>

            {/* ปุ่มลอย (position: fixed) ไม่กินที่ใน layout */}
            <CreateTenderProjectDialog />

            <TenderProjectStatsCards stats={stats} isPending={isPending} />

            <TenderProjectFilterBar
                departments={departmentOptions ?? []}
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                departmentId={departmentId}
                setDepartmentId={setDepartmentId}
                fiscalYear={fiscalYear}
                setFiscalYear={setFiscalYear}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                sort={sort}
                setSort={setSort}
                activeFilterCount={activeFilterCount}
                onSubmit={submitFilters}
                onClear={clearFilters}
            />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูลโครงการจัดซื้อจัดจ้างได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : isPending || isFetching ? (
                <TenderProjectTableSkeleton />
            ) : visible.length > 0 ? (
                <DataTable
                    columns={columns}
                    data={visible}
                    pageCount={pageCount}
                    total={total}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    renderMobileCard={(project) => (
                        <TenderProjectCard project={project} canUpdateStatus={canUpdateStatus} />
                    )}
                />
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {appliedSearch
                        ? "ไม่พบโครงการที่ตรงกับคำค้นหา"
                        : activeFilterCount > 0
                            ? "ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก"
                            : "ยังไม่มีโครงการในระบบ"
                    }
                </p>
            )}
        </div>
    );
}

export default function TenderProjectsPage() {
    return (
        <Suspense fallback={<TenderProjectListSkeleton />}>
            <TenderProjectsPageContent />
        </Suspense>
    )
}
