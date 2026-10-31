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
import type { UserStatusFilter, UserTypeFilter } from "@/lib/user/management/types";

const TYPE_OPTIONS: { value: UserTypeFilter; label: string }[] = [
  { value: "all", label: "ทุกประเภท" },
  { value: "internal", label: "พนักงานภายใน" },
  { value: "company", label: "นิติบุคคล" },
  { value: "individual", label: "ร้านค้า" },
];

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "active", label: "ใช้งานอยู่" },
  { value: "suspended", label: "ระงับการใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
];

// ครบทุกคู่ที่หัวตาราง (SortableHeader ใน columns.tsx) ตั้งได้
const SORT_OPTIONS: ListSortOption[] = [
  { label: "ค่าเริ่มต้น" },
  { label: "วันที่สร้าง ใหม่ → เก่า", id: "created_at", desc: true },
  { label: "วันที่สร้าง เก่า → ใหม่", id: "created_at" },
  { label: "ชื่อผู้ใช้ A → Z", id: "username" },
  { label: "ชื่อผู้ใช้ Z → A", id: "username", desc: true },
  { label: "อีเมล A → Z", id: "email" },
  { label: "อีเมล Z → A", id: "email", desc: true },
];

function FilterSelect<T extends string>({
  options,
  value,
  onValueChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <Select items={options} value={value} onValueChange={(next) => onValueChange(next as T)}>
      <SelectTrigger className="w-full lg:w-44 h-10! bg-white rounded-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * ตัวกรองมีผลทันทีที่เลือก (ไม่มีปุ่มค้นหา)
 * - เล็กกว่า lg: ช่องค้นหา + ปุ่มเปิด sheet (ตัวกรอง + เรียงลำดับ) + ปุ่มล้าง
 * - lg ขึ้นไป: ทุกช่องเรียงแถวเดียว; ช่วง lg–xl มี Select เรียงลำดับเพราะยังแสดงเป็นการ์ด
 */
export function UserFilterBar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  sorting,
  setSorting,
  activeFilterCount,
  onClear,
}: {
  search: string;
  setSearch: (value: string) => void;
  typeFilter: UserTypeFilter;
  setTypeFilter: (value: UserTypeFilter) => void;
  statusFilter: UserStatusFilter;
  setStatusFilter: (value: UserStatusFilter) => void;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  activeFilterCount: number;
  onClear: () => void;
}) {
  const fields = (
    <>
      <FilterSelect options={TYPE_OPTIONS} value={typeFilter} onValueChange={setTypeFilter} />
      <FilterSelect options={STATUS_OPTIONS} value={statusFilter} onValueChange={setStatusFilter} />
    </>
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
      <div className="flex gap-2 lg:contents">
        <SearchInput value={search} onValueChange={setSearch} placeholder="ค้นหาชื่อ | username | อีเมล" className="lg:min-w-64" />

        <div className="flex gap-2 lg:hidden">
          <ListFilterSheet activeCount={activeFilterCount} onClear={onClear}>
            <ListFilterSheetSection title="ตัวกรอง">{fields}</ListFilterSheetSection>
            <ListFilterSheetSection title="เรียงตาม">
              <ListSortSelect options={SORT_OPTIONS} sorting={sorting} onSortingChange={setSorting} />
            </ListFilterSheetSection>
          </ListFilterSheet>

          <ListClearButton onClear={onClear} />
        </div>
      </div>

      <div className="hidden lg:contents">
        {fields}
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
