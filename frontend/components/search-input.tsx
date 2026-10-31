"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onValueChange,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  // className ใส่ที่ wrapper เพื่อกำหนดความกว้าง (เช่น lg:min-w-64) — ถ้าใส่ที่ input จะล้นทับช่องข้าง ๆ
  return (
    <div className={cn("relative flex-1 min-w-0", className)}>
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white h-10 rounded-sm pr-8"
      />
      {value && (
        <button
          type="button"
          aria-label="ล้างคำค้นหา"
          onClick={() => onValueChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4 cursor-pointer" />
        </button>
      )}
    </div>
  );
}
