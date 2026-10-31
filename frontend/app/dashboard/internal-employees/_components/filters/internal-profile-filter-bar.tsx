"use client";

import { SearchInput } from "@/components/search-input";
import { DepartmentSelect } from "@/components/department-select";
import { PositionSelect } from "@/components/position-select";
import { ListClearButton, ListFilterSheet, ListFilterSheetSection } from "@/components/list-filter-sheet";
import { ListSortSelect, type ListSortOption } from "@/components/list-sort-select";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import type { Department, Position } from "@/lib/internal-profiles/types";

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกแผนก" };
const ALL_POSITIONS_OPTION = { value: "all", label: "ทุกตำแหน่ง" };

// ครบทุกคู่ที่หัวตาราง (SortableHeader ใน columns.tsx) ตั้งได้
const SORT_OPTIONS: ListSortOption[] = [
    { label: "ค่าเริ่มต้น" },
    { label: "รหัสพนักงาน น้อย → มาก", id: "employee_no" },
    { label: "รหัสพนักงาน มาก → น้อย", id: "employee_no", desc: true },
    { label: "ชื่อ ก → ฮ", id: "firstname" },
    { label: "ชื่อ ฮ → ก", id: "firstname", desc: true },
    { label: "นามสกุล ก → ฮ", id: "lastname" },
    { label: "นามสกุล ฮ → ก", id: "lastname", desc: true },
    { label: "แผนก ก → ฮ", id: "department" },
    { label: "แผนก ฮ → ก", id: "department", desc: true },
    { label: "ตำแหน่ง ก → ฮ", id: "position" },
    { label: "ตำแหน่ง ฮ → ก", id: "position", desc: true },
];

/**
 * ตัวกรองมีผลทันทีที่เลือก (ไม่มีปุ่มค้นหา)
 * - เล็กกว่า lg: ช่องค้นหา + ปุ่มเปิด sheet (ตัวกรอง + เรียงลำดับ) + ปุ่มล้าง
 * - lg ขึ้นไป: ทุกช่องเรียงแถวเดียว; ช่วง lg–xl มี Select เรียงลำดับเพราะยังแสดงเป็นการ์ด
 */
export function InternalProfileFilterBar({
    departments,
    positions,
    search,
    setSearch,
    departmentFilter,
    setDepartmentFilter,
    positionFilter,
    setPositionFilter,
    sorting,
    setSorting,
    activeFilterCount,
    onClear,
}: {
    departments: Department[];
    positions: Position[];
    search: string;
    setSearch: (value: string) => void;
    departmentFilter: string;
    setDepartmentFilter: (value: string) => void;
    positionFilter: string;
    setPositionFilter: (value: string) => void;
    sorting: SortingState;
    setSorting: OnChangeFn<SortingState>;
    activeFilterCount: number;
    onClear: () => void;
}) {
    const fields = (inSheet: boolean) => (
        <>
            <DepartmentSelect
                departments={departments}
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                allOption={ALL_DEPARTMENTS_OPTION}
                placeholder="แผนก"
                className="lg:w-44"
                inlineSearch={inSheet}
            />
            <PositionSelect
                positions={positions}
                value={positionFilter}
                onValueChange={setPositionFilter}
                allOption={ALL_POSITIONS_OPTION}
                placeholder="ตำแหน่ง"
                className="lg:w-44"
                inlineSearch={inSheet}
            />
        </>
    );

    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
            <div className="flex gap-2 lg:contents">
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหารหัสพนักงาน | ชื่อ | นามสกุล | เบอร์โทร"
                    className="lg:min-w-80"
                />

                <div className="flex gap-2 lg:hidden">
                    <ListFilterSheet activeCount={activeFilterCount} onClear={onClear}>
                        <ListFilterSheetSection title="ตัวกรอง">{fields(true)}</ListFilterSheetSection>
                        <ListFilterSheetSection title="เรียงตาม">
                            <ListSortSelect options={SORT_OPTIONS} sorting={sorting} onSortingChange={setSorting} />
                        </ListFilterSheetSection>
                    </ListFilterSheet>

                    <ListClearButton onClear={onClear} />
                </div>
            </div>

            <div className="hidden lg:contents">
                {fields(false)}
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
