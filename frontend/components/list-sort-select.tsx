"use client";

import { ArrowUpDown } from "lucide-react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ไม่ใส่ id = ลำดับ default ของ backend
export interface ListSortOption {
  label: string;
  id?: string;
  desc?: boolean;
}

const DEFAULT_VALUE = "default";

function toValue(option: { id?: string; desc?: boolean }): string {
  return option.id ? `${option.id}:${option.desc ? "desc" : "asc"}` : DEFAULT_VALUE;
}

/**
 * เลือกการเรียงลำดับแทนการกดหัวตาราง (การ์ดบนจอเล็กไม่มีหัวตาราง) — ใช้ state sorting
 * ชุดเดียวกับ DataTable จึงมีผลทันที; options ควรครบทุกคู่ (คอลัมน์ × ทิศทาง) ที่หัวตารางตั้งได้
 */
export function ListSortSelect({
  options,
  sorting,
  onSortingChange,
  className,
}: {
  options: ListSortOption[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  className?: string;
}) {
  const items = options.map((option) => ({ value: toValue(option), label: option.label }));

  return (
    <Select
      items={items}
      value={toValue(sorting[0] ?? {})}
      onValueChange={(next) => {
        const option = options.find((o) => toValue(o) === next);
        if (!option) return;
        onSortingChange(option.id ? [{ id: option.id, desc: !!option.desc }] : []);
      }}
    >
      <SelectTrigger aria-label="เรียงตาม" className={cn("w-full h-10! bg-white rounded-sm", className)}>
        <ArrowUpDown className="size-4 shrink-0 text-gray-500" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
