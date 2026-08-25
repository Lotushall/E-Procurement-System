"use client";

import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { Position } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

const EMPTY_OPTION = { value: "", label: "---" };

export function PositionSelect({
  positions,
  value,
  onValueChange,
  ariaInvalid,
  allOption,
  className,
}: {
  positions: Position[];
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  // Prepend an "all" choice, e.g. { value: "all", label: "ทุกตำแหน่ง" } — for filter usage.
  allOption?: { value: string; label: string };
  className?: string;
}) {
  const idByLabel = new Map(positions.map((p) => [p.name, String(p.id)]));
  const labelById = new Map(positions.map((p) => [String(p.id), p.name]));
  if (allOption) {
    idByLabel.set(allOption.label, allOption.value);
    labelById.set(allOption.value, allOption.label);
  } else {
    idByLabel.set(EMPTY_OPTION.label, EMPTY_OPTION.value);
    labelById.set(EMPTY_OPTION.value, EMPTY_OPTION.label);
  }

  const items = allOption
    ? [allOption.label, ...positions.map((p) => p.name)]
    : [EMPTY_OPTION.label, ...positions.map((p) => p.name)];

  return (
    <Combobox
      items={items}
      value={labelById.get(value) ?? null}
      onValueChange={(next) => {
        if (next === null) return;
        const id = idByLabel.get(next);
        if (id !== undefined) onValueChange(id);
      }}
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
              <ComboboxValue placeholder="เลือกตำแหน่ง" />
            </span>
            <ChevronDown />
          </Button>
        }
        className="h-10 rounded-sm"
      />
      <ComboboxContent>
        <ComboboxInput
          showTrigger={false}
          placeholder="ค้นหาตำแหน่ง"
          className="
          bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
          has-[[data-slot=input-group-control]:focus-visible]:border-transparent
          has-[[data-slot=input-group-control]:focus-visible]:ring-0
          "
        />
        <ComboboxEmpty>ไม่พบตำแหน่งที่ค้นหา</ComboboxEmpty>
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
