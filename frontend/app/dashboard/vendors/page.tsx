"use client";

import { Suspense } from "react";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import type { VendorListFilter } from "@/lib/vendor/approval/types";
import { useVendorListPage } from "./_hooks/use-vendor-list-page";
import { VendorStatsCards } from "./_components/vendor-stats-cards";
import { CARD_GRID_CLASS, VendorListSkeleton, VendorTableSkeleton } from "./_components/vendor-list-skeleton";
import { VendorFilterBar } from "./_components/filters/vendor-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./_components/table/columns";
import { VendorCard } from "./_components/table/vendor-card";

const EMPTY_MESSAGE: Record<VendorListFilter, string> = {
  all: "ยังไม่มีผู้ค้าลงทะเบียนในระบบ",
  pending: "ไม่มีผู้ค้าที่รอตรวจสอบ",
  approved: "ไม่มีผู้ค้าที่อนุมัติแล้ว",
  rejected: "ไม่มีผู้ค้าที่ถูกปฏิเสธ",
};

function VendorListPageContent() {
  useBreadcrumb([{ label: "ผู้ค้าที่ลงทะเบียน" }]);

  const {
    filter,
    setFilter,
    clearFilters,
    activeFilterCount,
    search,
    setSearch,
    debouncedSearch,
    counts,
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
  } = useVendorListPage();

  return (
    <div className="flex flex-col gap-5">

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน (Vendor Registration)</h1>
        <p className="text-sm text-gray-600 tracking-wide">ผู้ค้าที่สมัครผ่านระบบ ทั้งนิติบุคคลและบุคคลธรรมดา พร้อมสถานะการตรวจสอบ</p>
      </div>

      {isPending ? (
        <VendorListSkeleton />
      ) : (
        <>
          <VendorStatsCards counts={counts} active={filter} onSelect={setFilter} />

          <VendorFilterBar
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            sorting={sorting}
            setSorting={setSorting}
            activeFilterCount={activeFilterCount}
            onClear={clearFilters}
          />

          {isError ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง
            </p>
          ) : isFetching ? (
            <VendorTableSkeleton />
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
              renderMobileCard={(row) => <VendorCard vendor={row} />}
              mobileCardGridClassName={CARD_GRID_CLASS}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {debouncedSearch ? "ไม่พบผู้ค้าที่ตรงกับคำค้นหา" : EMPTY_MESSAGE[filter]}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function VendorListPage() {
  return (
    <Suspense fallback={<VendorListSkeleton />}>
      <VendorListPageContent />
    </Suspense>
  );
}
