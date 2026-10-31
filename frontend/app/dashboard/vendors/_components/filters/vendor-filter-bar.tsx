"use client";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { SearchInput } from "@/components/search-input";
import { ListClearButton, ListFilterSheet, ListFilterSheetSection } from "@/components/list-filter-sheet";
import { ListSortSelect, type ListSortOption } from "@/components/list-sort-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VendorListFilter } from "@/lib/vendor/approval/types";

const STATUS_OPTIONS: { value: VendorListFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
];

// ครบทุกคู่ที่หัวตาราง (SortableHeader ใน columns.tsx) ตั้งได้
const SORT_OPTIONS: ListSortOption[] = [
  { label: "ค่าเริ่มต้น" },
  { label: "วันที่สมัคร ใหม่ → เก่า", id: "created_at", desc: true },
  { label: "วันที่สมัคร เก่า → ใหม่", id: "created_at" },
  { label: "ชื่อผู้ค้า ก → ฮ", id: "name" },
  { label: "ชื่อผู้ค้า ฮ → ก", id: "name", desc: true },
  { label: "ประเภท ก → ฮ", id: "user_type" },
  { label: "ประเภท ฮ → ก", id: "user_type", desc: true },
  { label: "หมวดสินค้า/บริการ ก → ฮ", id: "business_type" },
  { label: "หมวดสินค้า/บริการ ฮ → ก", id: "business_type", desc: true },
];

/**
 * ตัวกรองมีผลทันทีที่เลือก (ไม่มีปุ่มค้นหา)
 * - เล็กกว่า lg: ช่องค้นหา + ปุ่มเปิด sheet (ตัวกรอง + เรียงลำดับ) + ปุ่มล้าง
 * - lg ขึ้นไป: ทุกช่องเรียงแถวเดียว; ช่วง lg–xl มี Select เรียงลำดับเพราะยังแสดงเป็นการ์ด
 */
export function VendorFilterBar({
  search,
  setSearch,
  filter,
  setFilter,
  sorting,
  setSorting,
  activeFilterCount,
  onClear,
}: {
  search: string;
  setSearch: (value: string) => void;
  filter: VendorListFilter;
  setFilter: (value: VendorListFilter) => void;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  activeFilterCount: number;
  onClear: () => void;
}) {
  const statusSelect = (
    <Select items={STATUS_OPTIONS} value={filter} onValueChange={(value) => setFilter(value as VendorListFilter)}>
      <SelectTrigger className="w-full lg:w-44 h-10! bg-white rounded-sm">
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
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
      <div className="flex gap-2 lg:contents">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="ค้นหาชื่อผู้ค้า | ชื่อร้านค้า | หมวดสินค้า/บริการ | เบอร์โทรศัพท์/อีเมล"
          className="lg:min-w-96"
        />

        <div className="flex gap-2 lg:hidden">
          <ListFilterSheet activeCount={activeFilterCount} onClear={onClear}>
            <ListFilterSheetSection title="ตัวกรอง">{statusSelect}</ListFilterSheetSection>
            <ListFilterSheetSection title="เรียงตาม">
              <ListSortSelect options={SORT_OPTIONS} sorting={sorting} onSortingChange={setSorting} />
            </ListFilterSheetSection>
          </ListFilterSheet>

          <ListClearButton onClear={onClear} />
        </div>
      </div>

      <div className="hidden lg:contents">
        {statusSelect}
        <ListSortSelect
          options={SORT_OPTIONS}
          sorting={sorting}
          onSortingChange={setSorting}
          className="lg:w-56 xl:hidden"
        />
      </div>
    </div>
  );
}
