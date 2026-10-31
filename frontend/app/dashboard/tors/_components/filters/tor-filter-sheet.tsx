"use client"

import { ListFilterSheet, ListFilterSheetSection } from "@/components/list-filter-sheet";
import type { TorSortValue } from "../../_hooks/use-tor-list-page";
import { TorFilterFields, type TorFilterFieldsProps } from "./tor-filter-fields";
import { TorSortSelect } from "./tor-sort-select";

// ตัวกรอง + การเรียงลำดับบนจอเล็กกว่า lg (ตัวกรองแบบร่าง: มีผลเมื่อกด "แสดงผล")
export function TorFilterSheet({
    sort,
    setSort,
    activeCount,
    onApply,
    onClear,
    ...fields
}: TorFilterFieldsProps & {
    sort: TorSortValue;
    setSort: (value: TorSortValue) => void;
    activeCount: number;
    onApply: () => void;
    onClear: () => void;
}) {
    return (
        <ListFilterSheet activeCount={activeCount} onApply={onApply} onClear={onClear}>
            <ListFilterSheetSection title="ตัวกรอง">
                <TorFilterFields {...fields} inSheet />
            </ListFilterSheetSection>

            <ListFilterSheetSection title="เรียงตาม">
                <TorSortSelect value={sort} onValueChange={setSort} />
            </ListFilterSheetSection>
        </ListFilterSheet>
    );
}
