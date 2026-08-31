"use client";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { Suspense } from "react";
import { useInternalProfileListPage } from "./_hooks/use-internal-profile-list-page";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./_components/table/columns";
import {
    InternalProfileListSkeleton,
    InternalProfileTableSkeleton,
} from "./_components/internal-profile-list-skeleton";
import { PositionSelect } from "@/components/position-select";
import { DepartmentSelect } from "@/components/department-select";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { usePositionOptions } from "@/lib/internal-profiles/queries/usePositionOptions";
import InternalProfileFormDialog from "./_components/internal-profile-form-dialog";

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกแผนก" };
const ALL_POSITIONS_OPTION = { value: "all", label: "ทุกตำแหน่ง" };

function InternalProfilesPageContent() {
    useBreadcrumb([{ label: "พนักงานภายใน" }]);

    const {
        search,
        setSearch,
        debouncedSearch,
        departmentFilter,
        setDepartmentFilter,
        positionFilter,
        setPositionFilter,
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

    console.log(visible);


    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">จัดการพนักงานภายใน</h1>
                    <p className="text-sm text-gray-600 tracking-wide">
                        รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.internal_employees.departments_positions} />}
                        nativeButton={false}
                        className="h-10 flex-1"
                    >
                        จัดการแผนก และตำแหน่ง
                    </Button>

                    <InternalProfileFormDialog />
                </div>
            </div>

            {isPending ? (
                <InternalProfileListSkeleton />
            ) : (
                <>
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <SearchInput
                            value={search}
                            onValueChange={setSearch}
                            placeholder="ค้นหารหัสพนักงาน | ชื่อ | นามสกุล | เบอร์โทร"
                        />

                        <div className="flex gap-3">
                            <DepartmentSelect
                                departments={departments ?? []}
                                value={departmentFilter}
                                onValueChange={setDepartmentFilter}
                                allOption={ALL_DEPARTMENTS_OPTION}
                                className="sm:w-44 flex-1"
                            />

                            <PositionSelect
                                positions={positions ?? []}
                                value={positionFilter}
                                onValueChange={setPositionFilter}
                                allOption={ALL_POSITIONS_OPTION}
                                className="sm:w-44 flex-1"
                            />
                        </div>
                    </div>

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
                        />
                    ) : (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                            {debouncedSearch
                                ? "ไม่พบพนักงานที่ตรงกับคำค้นหา"
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
