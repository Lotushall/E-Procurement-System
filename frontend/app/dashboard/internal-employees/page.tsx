"use client";

import { Suspense, useState } from "react";
import { Building2, UserPlus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { FloatingActionButton } from "@/components/floating-action-button";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { usePositionOptions } from "@/lib/internal-profiles/queries/usePositionOptions";
import { useInternalProfileListPage } from "./_hooks/use-internal-profile-list-page";
import {
    CARD_GRID_CLASS,
    InternalProfileListSkeleton,
    InternalProfileTableSkeleton,
} from "./_components/internal-profile-list-skeleton";
import InternalProfileFormDialog from "./_components/dialogs/internal-profile-form-dialog";
import { InternalProfileFilterBar } from "./_components/filters/internal-profile-filter-bar";
import { columns } from "./_components/table/columns";
import { InternalProfileCard } from "./_components/table/internal-profile-card";

function InternalProfilesPageContent() {
    useBreadcrumb([{ label: "พนักงานภายใน" }]);

    const [createOpen, setCreateOpen] = useState(false);

    const {
        search,
        setSearch,
        debouncedSearch,
        departmentFilter,
        setDepartmentFilter,
        positionFilter,
        setPositionFilter,
        clearFilters,
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
    } = useInternalProfileListPage();

    const { data: departments } = useDepartmentOptions();
    const { data: positions } = usePositionOptions();

    return (
        <div className="flex flex-col gap-5">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">จัดการพนักงานภายใน</h1>
                <p className="text-sm text-gray-600 tracking-wide">
                    รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
                </p>
            </div>

            <FloatingActionButton
                menuLabel="เพิ่มพนักงาน / จัดการแผนกและตำแหน่ง"
                actions={[
                    { label: "เพิ่มพนักงาน", icon: UserPlus, onSelect: () => setCreateOpen(true) },
                    {
                        label: "จัดการแผนกและตำแหน่ง",
                        icon: Building2,
                        href: routes.dashboards.internal_employees.departments_positions,
                    },
                ]}
            />
            <InternalProfileFormDialog open={createOpen} onOpenChange={setCreateOpen} />

            {isPending ? (
                <InternalProfileListSkeleton />
            ) : (
                <>
                    <InternalProfileFilterBar
                        departments={departments ?? []}
                        positions={positions ?? []}
                        search={search}
                        setSearch={setSearch}
                        departmentFilter={departmentFilter}
                        setDepartmentFilter={setDepartmentFilter}
                        positionFilter={positionFilter}
                        setPositionFilter={setPositionFilter}
                        sorting={sorting}
                        setSorting={setSorting}
                        activeFilterCount={activeFilterCount}
                        onClear={clearFilters}
                    />

                    {isError ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                            ไม่สามารถโหลดข้อมูลพนักงานได้ กรุณาลองใหม่อีกครั้ง
                        </p>
                    ) : isFetching ? (
                        <InternalProfileTableSkeleton />
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
                            renderMobileCard={(profile) => <InternalProfileCard profile={profile} />}
                            mobileCardGridClassName={CARD_GRID_CLASS}
                        />
                    ) : (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                            {debouncedSearch
                                ? "ไม่พบพนักงานที่ตรงกับคำค้นหา"
                                : activeFilterCount > 0
                                    ? "ไม่พบพนักงานที่ตรงกับเงื่อนไขที่เลือก"
                                    : "ยังไม่มีพนักงานภายในในระบบ"}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

export default function InternalProfilesPage() {
    return (
        <Suspense fallback={<InternalProfileListSkeleton />}>
            <InternalProfilesPageContent />
        </Suspense>
    );
}
