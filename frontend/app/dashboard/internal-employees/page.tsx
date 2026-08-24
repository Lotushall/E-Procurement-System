"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { useInternalProfileListPage } from "./_hooks/use-internal-profile-list-page";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./_components/table/columns";
import {
    InternalProfileListSkeleton,
    InternalProfileTableSkeleton,
} from "./_components/internal-profile-list-skeleton";
import { PositionSelect } from "./_components/position-select";
import { DepartmentSelect } from "./_components/department-select";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { usePositionOptions } from "@/lib/internal-profiles/queries/usePositionOptions";

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกแผนก" };
const ALL_POSITIONS_OPTION = { value: "all", label: "ทุกตำแหน่ง" };

export default function InternalProfilesPage() {
    return (
        <Suspense fallback={<InternalProfileListSkeleton />}>
            <InternalProfilesPageContent />
        </Suspense>
    );
}

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
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.user.roles} />}
                        nativeButton={false}
                        className="h-10"
                    >
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

            {isPending ? (
                <InternalProfileListSkeleton />
            ) : (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหารหัสพนักงาน | ชื่อ | นามสกุล | เบอร์โทร"
                            className="bg-white h-10 rounded-sm"
                        />

                        <DepartmentSelect
                            departments={departments ?? []}
                            value={departmentFilter}
                            onValueChange={setDepartmentFilter}
                            allOption={ALL_DEPARTMENTS_OPTION}
                            className="sm:w-44"
                        />

                        <PositionSelect
                            positions={positions ?? []}
                            value={positionFilter}
                            onValueChange={setPositionFilter}
                            allOption={ALL_POSITIONS_OPTION}
                            className="sm:w-44"
                        />
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
