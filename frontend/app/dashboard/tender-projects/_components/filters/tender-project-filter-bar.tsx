"use client"

import { Search } from "lucide-react";
import { ListClearButton } from "@/components/list-filter-sheet";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import type { TenderProjectSortValue } from "../../_hooks/use-tender-project-list-page";
import { TenderProjectFilterFields, type TenderProjectFilterFieldsProps } from "./tender-project-filter-fields";
import { TenderProjectFilterSheet } from "./tender-project-filter-sheet";
import { TenderProjectSortSelect } from "./tender-project-sort-select";

/**
 * - เล็กกว่า lg: ช่องค้นหา + ปุ่มเปิด sheet (ตัวกรอง + เรียงลำดับ) + ปุ่มล้าง
 * - lg ขึ้นไป: wrapper เป็น `contents` ให้ทุกช่องเรียงแถวเดียว; ช่วง lg–xl มี Select เรียงลำดับด้วย
 *   เพราะยังแสดงเป็นการ์ด ส่วน xl ขึ้นไปเป็นตารางที่กดหัวคอลัมน์ sort ได้
 */
export function TenderProjectFilterBar({
    search,
    setSearch,
    sort,
    setSort,
    activeFilterCount,
    onSubmit,
    onClear,
    ...fields
}: TenderProjectFilterFieldsProps & {
    search: string;
    setSearch: (value: string) => void;
    sort: TenderProjectSortValue;
    setSort: (value: TenderProjectSortValue) => void;
    activeFilterCount: number;
    onSubmit: () => void;
    onClear: () => void;
}) {
    return (
        <form
            className="flex flex-col gap-3 lg:flex-row lg:flex-wrap"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <div className="flex gap-2 lg:contents">
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหาชื่อโครงการ | รหัสโครงการ"
                    className="lg:min-w-72"
                />

                <div className="flex gap-2 lg:hidden">
                    <TenderProjectFilterSheet
                        {...fields}
                        sort={sort}
                        setSort={setSort}
                        activeCount={activeFilterCount}
                        onApply={onSubmit}
                        onClear={onClear}
                    />

                    <ListClearButton onClear={onClear} />
                </div>
            </div>

            <div className="hidden lg:contents">
                <TenderProjectFilterFields {...fields} />

                <TenderProjectSortSelect value={sort} onValueChange={setSort} className="lg:w-60 xl:hidden" />

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
                    onClick={onClear}
                >
                    ล้างตัวกรอง
                </Button>
            </div>
        </form>
    );
}
