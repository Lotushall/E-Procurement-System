"use client";

import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { AvailableInternalProfile } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

export function InternalProfileSelect({
  profiles,
  value,
  onValueChange,
  ariaInvalid,
  className,
}: {
  profiles: AvailableInternalProfile[];
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const selected = profiles.find((p) => String(p.id) === value) ?? null;

  return (
    <Combobox
      items={profiles}
      itemToStringLabel={(p: AvailableInternalProfile) => p.name}
      isItemEqualToValue={(item: AvailableInternalProfile, val: AvailableInternalProfile) => item.id === val.id}
      value={selected}
      onValueChange={(next) => onValueChange(next ? String(next.id) : "")}
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
              <ComboboxValue placeholder="เลือกพนักงาน">
                {(v: AvailableInternalProfile | null) => v?.name ?? "เลือกพนักงาน"}
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
        <ComboboxEmpty>ไม่พบพนักงานที่ว่าง</ComboboxEmpty>
        <ComboboxList>
          {(item: AvailableInternalProfile) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
