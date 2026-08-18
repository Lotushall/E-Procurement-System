"use client";

import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { RoleDetail } from "@/lib/user/management/types";

export function RoleSelect({
  roles,
  value,
  onValueChange,
  ariaInvalid,
}: {
  roles: RoleDetail[];
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
}) {
  return (
    <Select
      items={roles.map((r) => ({ value: r.name, label: r.name }))}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger className="w-full h-11! rounded-sm" aria-invalid={ariaInvalid}>
        <SelectValue className="capitalize" placeholder="เลือก role" />
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false}>
        <SelectGroup>
          {roles.map((r) => (
            <SelectItem key={r.name} value={r.name} className="capitalize">
              {r.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
