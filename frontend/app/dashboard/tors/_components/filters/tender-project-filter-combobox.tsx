"use client"

import { ChevronDown } from "lucide-react";
import {
    Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
    ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { TenderProjectOption } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";
import type { TorTenderProjectFilter } from "../../_hooks/use-tor-list-page";

const ALL_LABEL = "ทุกโครงการ";
const NONE_LABEL = "ไม่สังกัดโครงการ";
const PLACEHOLDER = "โครงการ";

// รหัสโครงการไม่ซ้ำกัน label จึงใช้แทนค่าได้
const projectLabel = (project: TenderProjectOption) => `${project.projectCode} · ${project.name}`;

// ระหว่างโหลดหรือโหลดตัวเลือกไม่ได้ จะเหลือแค่ "ทุกโครงการ" กับ "ไม่สังกัดโครงการ"
export function TenderProjectFilterCombobox({
    projects,
    value,
    onValueChange,
    className,
    inlineSearch = false,
}: {
    projects: TenderProjectOption[];
    value: TorTenderProjectFilter;
    onValueChange: (next: TorTenderProjectFilter) => void;
    className?: string;
    // ใน sheet: พิมพ์ค้นหาในช่องเอง แทนช่องค้นหาใน popup ที่ดึง focus ออกนอก sheet
    inlineSearch?: boolean;
}) {
    const entries: [string, TorTenderProjectFilter][] = [
        [ALL_LABEL, undefined],
        [NONE_LABEL, "none"],
        ...projects.map((project): [string, TorTenderProjectFilter] => [projectLabel(project), project.id]),
    ];
    const items = entries.map(([label]) => label);

    // ไม่กรอง = แสดง placeholder; id ที่ยังไม่อยู่ในรายการ (กำลังโหลด) ก็แสดง placeholder เช่นกัน
    const selected =
        value === undefined
            ? null
            : (entries.find(([, entryValue]) => entryValue === value)?.[0] ?? null);

    return (
        <Combobox
            items={items}
            value={selected}
            onValueChange={(next) => {
                if (next === null) return;
                const entry = entries.find(([label]) => label === next);
                if (entry) onValueChange(entry[1]);
            }}
        >
            {inlineSearch ? (
                <ComboboxInput
                    placeholder={PLACEHOLDER}
                    className={cn(
                        "h-10 w-full rounded-sm bg-white",
                        "has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0",
                        className,
                    )}
                />
            ) : (
                <ComboboxTrigger
                    render={
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-between font-normal text-black bg-white hover:bg-white data-popup-open:bg-white data-placeholder:text-gray-400",
                                "focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none",
                                className,
                            )}
                        >
                            <span className="min-w-0 truncate">
                                <ComboboxValue placeholder={PLACEHOLDER} />
                            </span>
                            <ChevronDown />
                        </Button>
                    }
                    className="h-10 rounded-sm"
                />
            )}
            <ComboboxContent>
                {!inlineSearch && (
                    <ComboboxInput
                        showTrigger={false}
                        placeholder="ค้นหาโครงการ"
                        className="
                        bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
                        has-[[data-slot=input-group-control]:focus-visible]:border-transparent
                        has-[[data-slot=input-group-control]:focus-visible]:ring-0
                        "
                    />
                )}
                <ComboboxEmpty>ไม่พบโครงการที่ค้นหา</ComboboxEmpty>
                <ComboboxList>
                    {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
