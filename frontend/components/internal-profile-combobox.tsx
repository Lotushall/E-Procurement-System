"use client";

import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useInternalProfileOptions } from "@/lib/internal-profiles/queries/useInternalProfileOptions";
import type { InternalProfileOption } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

const NONE_OPTION: InternalProfileOption = { id: 0, name: "---" };

export function InternalProfileCombobox({
  value,
  onValueChange,
  ariaInvalid,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const { data } = useInternalProfileOptions();
  const profiles = [NONE_OPTION, ...(data ?? [])];
  const selected = value === "" ? NONE_OPTION : (profiles.find((p) => String(p.id) === value) ?? null);

  return (
    <Combobox
      items={profiles}
      itemToStringLabel={(p: InternalProfileOption) => p.name}
      isItemEqualToValue={(item: InternalProfileOption, val: InternalProfileOption) => item.id === val.id}
      value={selected}
      onValueChange={(next: InternalProfileOption | null) =>
        onValueChange(next && next.id !== NONE_OPTION.id ? String(next.id) : "")
      }
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-between font-normal text-black bg-white hover:bg-white data-popup-open:bg-white data-placeholder:text-gray-400",
              "focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none",
              className,
            )}
          >
            <span className="min-w-0 truncate">
              <ComboboxValue placeholder="เลือกผู้รับผิดชอบ">
                {(v: InternalProfileOption | null) => v?.name ?? "เลือกผู้รับผิดชอบ"}
              </ComboboxValue>
            </span>
            <ChevronDown />
          </Button>
        }
        className="h-10 rounded-sm"
      />
      <ComboboxContent>
        <ComboboxInput
          showTrigger={false}
          placeholder="ค้นหาพนักงาน"
          className="
          bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
          has-[[data-slot=input-group-control]:focus-visible]:border-transparent
          has-[[data-slot=input-group-control]:focus-visible]:ring-0
          "
        />
        <ComboboxEmpty>ไม่พบพนักงานที่ค้นหา</ComboboxEmpty>
        <ComboboxList>
          {(item: InternalProfileOption) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
