"use client";

import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { Department } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

const EMPTY_OPTION = { value: "", label: "---" };

export function DepartmentSelect({
  departments,
  value,
  onValueChange,
  ariaInvalid,
  allOption,
  // Show `placeholder` instead of allOption's label whenever value === allOption.value —
  // for filter usage where "not filtered" should read as a placeholder, not a chosen value.
  placeholder,
  className,
}: {
  departments: Department[];
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  // Prepend an "all" choice, e.g. { value: "all", label: "ทุกแผนก" } — for filter usage.
  allOption?: { value: string; label: string };
  placeholder?: string;
  className?: string;
}) {
  const idByLabel = new Map(departments.map((d) => [d.name, String(d.id)]));
  const labelById = new Map(departments.map((d) => [String(d.id), d.name]));
  if (allOption) {
    idByLabel.set(allOption.label, allOption.value);
    labelById.set(allOption.value, allOption.label);
  } else {
    idByLabel.set(EMPTY_OPTION.label, EMPTY_OPTION.value);
    labelById.set(EMPTY_OPTION.value, EMPTY_OPTION.label);
  }

  const items = allOption
    ? [allOption.label, ...departments.map((d) => d.name)]
    : [EMPTY_OPTION.label, ...departments.map((d) => d.name)];

  const comboboxValue =
    placeholder && allOption && value === allOption.value
      ? null
      : (labelById.get(value) ?? null);

  return (
    <Combobox
      items={items}
      value={comboboxValue}
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
              <ComboboxValue placeholder={placeholder ?? "เลือกแผนก"} />
            </span>
            <ChevronDown />
          </Button>
        }
        className="h-10 rounded-sm"
      />
      <ComboboxContent>
        <ComboboxInput
          showTrigger={false}
          placeholder="ค้นหาแผนก"
          className="
          bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
          has-[[data-slot=input-group-control]:focus-visible]:border-transparent
          has-[[data-slot=input-group-control]:focus-visible]:ring-0
          "
        />
        <ComboboxEmpty>ไม่พบแผนกที่ค้นหา</ComboboxEmpty>
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
