"use client";

import { ChevronDown } from "lucide-react";
import {
    Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
    ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { TenderProjectOption } from "@/lib/tender/tender-projects/types";

const NONE_LABEL = "ไม่สังกัดโครงการ";

// รหัสโครงการไม่ซ้ำกัน label จึงใช้แทนค่าได้
const projectLabel = (project: TenderProjectOption) => `${project.projectCode} · ${project.name}`;

// ค่าในฟอร์มเป็น id แบบ string — "" = ไม่สังกัดโครงการ
export function TenderProjectSelect({
    projects,
    value,
    onValueChange,
    disabled,
    ariaInvalid,
}: {
    projects: TenderProjectOption[];
    value: string;
    onValueChange: (next: string) => void;
    disabled?: boolean;
    ariaInvalid?: boolean;
}) {
    const entries: [string, string][] = [
        [NONE_LABEL, ""],
        ...projects.map((project): [string, string] => [projectLabel(project), String(project.id)]),
    ];

    return (
        <Combobox
            items={entries.map(([label]) => label)}
            value={entries.find(([, id]) => id === value)?.[0] ?? NONE_LABEL}
            onValueChange={(next) => {
                const entry = entries.find(([label]) => label === next);
                if (entry) onValueChange(entry[1]);
            }}
            disabled={disabled}
        >
            <ComboboxTrigger
                render={
                    <Button
                        variant="outline"
                        aria-invalid={ariaInvalid}
                        className="w-full justify-between font-normal text-black bg-white hover:bg-white data-popup-open:bg-white"
                    >
                        <span className="min-w-0 truncate">
                            <ComboboxValue />
                        </span>
                        <ChevronDown />
                    </Button>
                }
                className="h-10 rounded-sm"
            />
            <ComboboxContent>
                <ComboboxInput
                    showTrigger={false}
                    placeholder="ค้นหาโครงการ"
                    className="
                    bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
                    has-[[data-slot=input-group-control]:focus-visible]:border-transparent
                    has-[[data-slot=input-group-control]:focus-visible]:ring-0
                    "
                />
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
