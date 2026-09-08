"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useInternalProfileList } from "@/lib/internal-profiles/queries/useInternalProfileList";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

function formatProfileName(profile: InternalProfile): string {
  return `${profile.firstname} ${profile.lastname}`;
}

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
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Remembered separately from the live search results: once the user picks
  // someone, a later keystroke can filter that person out of `profiles` —
  // without this, the trigger would fall back to the placeholder mid-search
  // even though a value is still selected.
  const [selected, setSelected] = useState<InternalProfile | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  // Derived, not synced via effect: when the parent externally clears `value`
  // (e.g. form.reset()), `selected` may still hold the stale profile object —
  // masking it here means the trigger and the Combobox both correctly show
  // "nothing selected" without a setState-in-effect render pass. `selected`
  // itself is left stale until the next real pick, which is harmless since
  // it's never read while `value` is empty.
  const displayed = value === "" ? null : selected;

  const { data } = useInternalProfileList(1, 20, debouncedQuery || undefined);
  const profiles = data?.data ?? [];

  return (
    <Combobox
      items={profiles}
      itemToStringLabel={(p: InternalProfile) => formatProfileName(p)}
      isItemEqualToValue={(item: InternalProfile, val: InternalProfile) => item.id === val.id}
      value={displayed}
      onValueChange={(next: InternalProfile | null) => {
        setSelected(next);
        onValueChange(next ? String(next.id) : "");
      }}
      onInputValueChange={setQuery}
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
                {(v: InternalProfile | null) => (v ? formatProfileName(v) : "เลือกผู้รับผิดชอบ")}
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
          {(item: InternalProfile) => (
            <ComboboxItem key={item.id} value={item}>
              {formatProfileName(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
