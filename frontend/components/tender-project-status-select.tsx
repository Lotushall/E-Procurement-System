"use client";

import { isAxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TENDER_PROJECT_STATUSES,
  TENDER_PROJECT_STATUS_STYLE,
} from "@/components/tender-project-status-badge";
import { useUpdateTenderProjectStatus } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";

const STATUS_ITEMS = TENDER_PROJECT_STATUSES.map((value) => ({
  value,
  label: TENDER_PROJECT_STATUS_STYLE[value].label,
}));

// ใช้ message จาก backend เฉพาะ 422 ซึ่งเป็นภาษาไทย ส่วน 403 และ error อื่นของ Laravel เป็นภาษาอังกฤษ
function getErrorMessage(error: unknown): string {
  const message =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { message?: string } | undefined)?.message
      : undefined;
  return message ?? "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function TenderProjectStatusSelect({ id, status }: { id: number; status: TenderProjectStatus }) {
  const updateStatus = useUpdateTenderProjectStatus(id);
  const style = TENDER_PROJECT_STATUS_STYLE[status];

  const handleChange = (next: string | null) => {
    if (!next || next === status || updateStatus.isPending) return;
    toast.promise(updateStatus.mutateAsync(next as TenderProjectStatus), {
      loading: "กำลังเปลี่ยนสถานะ...",
      success: "เปลี่ยนสถานะสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Select items={STATUS_ITEMS} value={status} onValueChange={handleChange}>
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
          {TENDER_PROJECT_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {TENDER_PROJECT_STATUS_STYLE[value].label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
