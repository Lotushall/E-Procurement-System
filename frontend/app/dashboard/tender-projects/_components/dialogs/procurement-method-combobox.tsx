"use client";

import { useState, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxSeparator, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { PROCUREMENT_METHODS } from "../../_data/procurement-methods";

export function ProcurementMethodCombobox({
  value,
  onValueChange,
  ariaInvalid,
  ...field
}: {
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid: boolean;
} & Omit<
  ComponentProps<typeof Combobox<string>>,
  "items" | "value" | "onValueChange" | "onInputValueChange" | "children"
>) {
  const [query, setQuery] = useState("");

  const canAdd = query.trim().length > 0 && !PROCUREMENT_METHODS.some(
    (method) => method.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <Combobox
      items={PROCUREMENT_METHODS}
      value={value}
      onValueChange={(next) => onValueChange(next ?? "")}
      onInputValueChange={setQuery}
      {...field}
    >
      <ComboboxTrigger
        render={
          <Button
            aria-invalid={ariaInvalid}
            variant="outline"
            className="w-full justify-between font-normal text-black data-popup-open:border-gray-700 hover:bg-transparent data-placeholder:text-gray-400"
          >
            <span className="min-w-0 truncate">
              <ComboboxValue placeholder="เลือกวิธีจัดซื้อ" />
            </span>
            <ChevronDown />
          </Button>
        }
        className="h-10 rounded-sm bg-transparent"
      />
      <ComboboxContent>
        <ComboboxInput
          showTrigger={false}
          placeholder="ค้นหาวิธีจัดซื้อ"
          className="
          bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
          has-[[data-slot=input-group-control]:focus-visible]:border-transparent
          has-[[data-slot=input-group-control]:focus-visible]:ring-0
          "
        />
        <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
        {canAdd && (
          <>
            <ComboboxSeparator />
            <ComboboxList>
              <ComboboxItem value={query.trim()} className="cursor-pointer">
                {`+ เพิ่ม "${query.trim()}"`}
              </ComboboxItem>
            </ComboboxList>
          </>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
