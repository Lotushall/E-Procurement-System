"use client";

import { isAxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateUserStatus } from "@/lib/user/management/mutations/useUpdateUserStatus";
import type { UserStatus } from "@/lib/user/management/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<UserStatus, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  active: { label: "ใช้งานอยู่", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  suspended: { label: "ระงับการใช้งาน", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  inactive: { label: "ปิดใช้งาน", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-500" },
};

const ALL_STATUSES: UserStatus[] = ["pending", "active", "suspended", "inactive"];

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function UserStatusSelect({ id, status }: { id: number; status: UserStatus }) {
  const updateStatus = useUpdateUserStatus(id);
  const style = STATUS_STYLE[status];

  const handleChange = (next: string | null) => {
    if (!next || next === status || updateStatus.isPending) return;
    toast.promise(updateStatus.mutateAsync(next as UserStatus), {
      loading: "กำลังเปลี่ยนสถานะ...",
      success: "เปลี่ยนสถานะสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Select
      items={ALL_STATUSES.map((value) => ({ value, label: STATUS_STYLE[value].label }))}
      value={status}
      onValueChange={handleChange}
    >
      <SelectTrigger size="sm" className={cn("rounded-full border-0 tracking-wider", style.badge)}>
        {updateStatus.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false}>
        <SelectGroup>
          {ALL_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_STYLE[value].label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
