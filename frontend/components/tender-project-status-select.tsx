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
  TenderProjectStatusBadge,
} from "@/components/tender-project-status-badge";
import { useAuthPermissions } from "@/lib/auth/permissions";
import { useUpdateTenderProjectStatus } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus";
import { allowedNextStatuses } from "@/lib/tender/tender-projects/status-rules";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";


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
  const { hasRole } = useAuthPermissions();
  const style = TENDER_PROJECT_STATUS_STYLE[status];

  // สถานะปัจจุบัน + สถานะถัดไปที่เปลี่ยนได้ เรียงตามลำดับของ TENDER_PROJECT_STATUSES
  const nextStatuses = allowedNextStatuses(status, hasRole("admin"));
  const options = TENDER_PROJECT_STATUSES.filter((value) => value === status || nextStatuses.includes(value));
  const items = options.map((value) => ({ value, label: TENDER_PROJECT_STATUS_STYLE[value].label }));

  // ไม่มีสถานะให้เปลี่ยนต่อแล้ว (archived สำหรับผู้ที่ไม่ใช่ admin) — แสดงเป็น badge เฉย ๆ
  if (nextStatuses.length === 0) {
    return <TenderProjectStatusBadge status={status} />;
  }

  const handleChange = (next: string | null) => {
    if (!next || next === status || updateStatus.isPending) return;
    toast.promise(updateStatus.mutateAsync(next as TenderProjectStatus), {
      loading: "กำลังเปลี่ยนสถานะ...",
      success: "เปลี่ยนสถานะสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Select items={items} value={status} onValueChange={handleChange}>
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
          {options.map((value) => (
            <SelectItem key={value} value={value}>
              {TENDER_PROJECT_STATUS_STYLE[value].label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
