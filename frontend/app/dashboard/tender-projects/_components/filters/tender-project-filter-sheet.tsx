"use client"

import { ListFilterSheet, ListFilterSheetSection } from "@/components/list-filter-sheet";
import type { TenderProjectSortValue } from "../../_hooks/use-tender-project-list-page";
import { TenderProjectFilterFields, type TenderProjectFilterFieldsProps } from "./tender-project-filter-fields";
import { TenderProjectSortSelect } from "./tender-project-sort-select";

// ตัวกรอง + การเรียงลำดับบนจอเล็กกว่า lg (ตัวกรองแบบร่าง: มีผลเมื่อกด "แสดงผล")
export function TenderProjectFilterSheet({
    sort,
    setSort,
    activeCount,
    onApply,
    onClear,
    ...fields
}: TenderProjectFilterFieldsProps & {
    sort: TenderProjectSortValue;
    setSort: (value: TenderProjectSortValue) => void;
    activeCount: number;
    onApply: () => void;
    onClear: () => void;
}) {
    return (
        <ListFilterSheet activeCount={activeCount} onApply={onApply} onClear={onClear}>
            <ListFilterSheetSection title="ตัวกรอง">
                <TenderProjectFilterFields {...fields} calendarMonths={1} inSheet />
            </ListFilterSheetSection>

            <ListFilterSheetSection title="เรียงตาม">
                <TenderProjectSortSelect value={sort} onValueChange={setSort} />
            </ListFilterSheetSection>
        </ListFilterSheet>
    );
}
