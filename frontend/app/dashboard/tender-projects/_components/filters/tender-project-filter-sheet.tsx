"use client"

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import type { TenderProjectSortValue } from "../../_hooks/use-tender-project-list-page";
import { TenderProjectFilterFields, type TenderProjectFilterFieldsProps } from "./tender-project-filter-fields";
import { TenderProjectSortSelect } from "./tender-project-sort-select";

// ตัวกรอง + การเรียงลำดับบนจอเล็กกว่า lg: ซ่อนไว้หลังปุ่มเดียว แทนการเรียงทุกช่องลงมาเต็มจอ
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
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        aria-label={activeCount > 0 ? `ตัวกรอง (ใช้อยู่ ${activeCount})` : "ตัวกรอง"}
                        className="relative h-10 shrink-0 gap-2 bg-white"
                    />
                }
            >
                <SlidersHorizontal className="size-4 text-gray-600" />
                <span className="hidden sm:inline">ตัวกรอง</span>
                {activeCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-red-700 text-[11px] font-bold text-white">
                        {activeCount}
                    </span>
                )}
            </SheetTrigger>

            <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl">
                <SheetHeader className="border-b">
                    <SheetTitle className="font-bold">ตัวกรองและการเรียงลำดับ</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-5 overflow-y-auto p-4">
                    <section className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-gray-600">ตัวกรอง</h3>
                        <TenderProjectFilterFields {...fields} calendarMonths={1} inSheet />
                    </section>

                    <section className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-gray-600">เรียงตาม</h3>
                        <TenderProjectSortSelect value={sort} onValueChange={setSort} />
                    </section>
                </div>

                <SheetFooter className="flex-row border-t">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 flex-1 bg-white"
                        onClick={() => {
                            onClear();
                            setOpen(false);
                        }}
                    >
                        ล้างตัวกรอง
                    </Button>
                    <Button
                        type="button"
                        className="h-10 flex-1 bg-red-700 text-white hover:bg-red-600"
                        onClick={() => {
                            onApply();
                            setOpen(false);
                        }}
                    >
                        แสดงผล
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
