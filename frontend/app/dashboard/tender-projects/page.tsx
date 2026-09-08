"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { Suspense, useMemo } from "react";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    TenderProjectStatsCards,
} from "./_components/tender-project-stats-cards";
import type { TenderProjectStatusFilter } from "@/lib/tender/tender-projects/types";
import { useTenderProjectListPage } from "./_hooks/use-tender-project-list-page";
import { DataTable } from "@/components/ui/data-table";
import { createColumns } from "./_components/table/columns";
import {
    TenderProjectListSkeleton,
    TenderProjectTableSkeleton,
} from "./_components/tender-project-list-skeleton";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { DepartmentSelect } from "@/components/department-select";
import { CreateTenderProjectDialog } from "./_components/create-tender-project-dialog";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกหน่วยงาน" };

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "ทุกปีงบประมาณ" },
    ...Array.from({ length: 5 }, (_, i) => {
        const year = CURRENT_BUDDHIST_YEAR + 1 - i;
        return { value: String(year), label: `ปีงบประมาณ ${year}` };
    }),
];

const STATUS_OPTIONS: { value: TenderProjectStatusFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "draft", label: "ร่าง" },
    { value: "published", label: "กำลังดำเนินการ" },
    { value: "closed", label: "ปิดรับซอง" },
    { value: "completed", label: "เสร็จสิ้น" },
    { value: "cancelled", label: "ยกเลิก" },
    { value: "archived", label: "เก็บถาวร" },
];

function TenderProjectsPageContent() {
    useBreadcrumb([{ label: "จัดการโครงการจัดซื้อจัดจ้าง" }]);

    const columns = useMemo(
        () => createColumns(),
        [],
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
        submitFilters,
        clearFilters,
        appliedSearch,
        appliedStatus,
        appliedDepartmentId,
        appliedFiscalYear,
        appliedDateFrom,
        appliedDateTo,
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
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">จัดการโครงการจัดซื้อจัดจ้าง</h1>
                    <p className="text-sm text-gray-600 tracking-wide">
                        ภาพรวมโครงการทั้งหมดและ TOR ที่เกี่ยวข้อง
                    </p>
                </div>

                <div>
                    <CreateTenderProjectDialog />
                </div>
            </div>

            <TenderProjectStatsCards stats={stats} isPending={isPending} />

            <form
                className="flex flex-col gap-3 lg:flex-row flex-wrap"
                onSubmit={(e) => {
                    e.preventDefault();
                    submitFilters();
                }}
            >
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหาชื่อโครงการ | รหัสโครงการ"
                    className=""
                />

                <Select
                    items={STATUS_OPTIONS}
                    value={status === "all" ? null : status}
                    onValueChange={(value) => setStatus((value ?? "all") as TenderProjectStatusFilter)}
                >
                    <SelectTrigger className="lg:w-44 h-10! bg-white rounded-sm">
                        <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <DepartmentSelect
                    departments={departmentOptions ?? []}
                    value={departmentId !== undefined ? String(departmentId) : "all"}
                    onValueChange={(value) => setDepartmentId(value === "all" ? undefined : Number(value))}
                    allOption={ALL_DEPARTMENTS_OPTION}
                    placeholder="แผนก"
                    className="lg:w-44"
                />

                <Select
                    items={FISCAL_YEAR_OPTIONS}
                    value={fiscalYear ?? null}
                    onValueChange={(value) => setFiscalYear(value && value !== "all" ? value : undefined)}
                >
                    <SelectTrigger className="lg:w-44 h-10! bg-white rounded-sm">
                        <SelectValue placeholder="ปีงบประมาณ" />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {FISCAL_YEAR_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Popover>
                    <PopoverTrigger
                        render={
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10! justify-start gap-2 bg-white font-normal lg:w-60  focus:bg-white!  aria-expanded:bg-white! hover:bg-white!"
                            >
                                <CalendarIcon className="size-4 shrink-0 text-gray-500" />
                                {dateFrom || dateTo ? (
                                    <span className="truncate">
                                        {dateFrom
                                            ? format(parseDateParam(dateFrom)!, "d MMM yyyy", { locale: th })
                                            : "..."}
                                        {" ถึง "}
                                        {dateTo
                                            ? format(parseDateParam(dateTo)!, "d MMM yyyy", { locale: th })
                                            : "..."}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">ระยะเวลาโครงการ</span>
                                )}
                            </Button>
                        }
                    />
                    <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                            mode="range"
                            locale={th}
                            captionLayout="dropdown"
                            numberOfMonths={2}
                            defaultMonth={parseDateParam(dateFrom)}
                            selected={{ from: parseDateParam(dateFrom), to: parseDateParam(dateTo) }}
                            onSelect={(range) => {
                                setDateFrom(range?.from ? format(range.from, DATE_PARAM_FORMAT) : undefined);
                                setDateTo(range?.to ? format(range.to, DATE_PARAM_FORMAT) : undefined);
                            }}
                        />
                        <div className="flex justify-end border-t border-border p-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setDateFrom(undefined);
                                    setDateTo(undefined);
                                }}
                            >
                                ล้างค่า
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button
                    type="submit"
                    aria-label="ค้นหา"
                    className="h-10 shrink-0 bg-red-700 text-white hover:bg-red-600"
                >
                    <Search className="size-4" />
                    ค้นหา
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    aria-label="ล้างตัวกรอง"
                    className="h-10 shrink-0 bg-white"
                    onClick={clearFilters}
                >
                    ล้างตัวกรอง
                </Button>
            </form>

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
                />
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {appliedSearch
                        ? "ไม่พบโครงการที่ตรงกับคำค้นหา"
                        : appliedStatus !== "all" ||
                            appliedDepartmentId !== undefined ||
                            appliedFiscalYear !== undefined ||
                            appliedDateFrom !== undefined ||
                            appliedDateTo !== undefined
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
