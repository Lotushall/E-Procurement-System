"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useVendorListPage } from "./_hooks/use-vendor-list-page";
import { VendorRow } from "./_components/vendor-row";
import { VendorStatsCards, type VendorListFilter } from "./_components/vendor-stats-cards";

const STATUS_OPTIONS: { value: VendorListFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
];

const EMPTY_MESSAGE: Record<VendorListFilter, string> = {
  all: "ยังไม่มีผู้ค้าลงทะเบียนในระบบ",
  pending: "ไม่มีผู้ค้าที่รอตรวจสอบ",
  approved: "ไม่มีผู้ค้าที่อนุมัติแล้ว",
  rejected: "ไม่มีผู้ค้าที่ถูกปฏิเสธ",
};

export default function VendorListPage() {
  useBreadcrumb([{ label: "ผู้ค้าที่ลงทะเบียน" }]);

  const {
    filter,
    setFilter,
    search,
    setSearch,
    debouncedSearch,
    counts,
    visible,
    isPending,
    isError,
  } = useVendorListPage();

  console.log(visible);

  return (
    <div className="flex flex-col gap-5">

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน (Vendor Registration)</h1>
        <p className="text-sm text-gray-600 tracking-wide">ผู้ค้าที่สมัครผ่านระบบ ทั้งนิติบุคคลและบุคคลธรรมดา พร้อมสถานะการตรวจสอบ</p>
      </div>

      <VendorStatsCards counts={counts} active={filter} onSelect={setFilter} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // placeholder="ค้นหาชื่อผู้ค้า"
          className="bg-white h-10 rounded-sm"
        />

        <Select
          items={STATUS_OPTIONS}
          value={filter}
          onValueChange={(value) => setFilter(value as VendorListFilter)}
        >
          <SelectTrigger className="sm:w-40 h-10! bg-white rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" alignItemWithTrigger={false}>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : visible.length > 0 ? (
        <div className="flex flex-col gap-2">
          {visible.map((vendor) => (
            <VendorRow key={vendor.id} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {debouncedSearch ? "ไม่พบผู้ค้าที่ตรงกับคำค้นหา" : EMPTY_MESSAGE[filter]}
        </p>
      )}
    </div>
  );
}
