"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeletePermission } from "@/lib/user/management/mutations/useDeletePermission";
import type { Permission } from "@/lib/user/management/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบ permission ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeletePermissionDialog({ permission }: { permission: Permission }) {
  const [open, setOpen] = useState(false);
  const deletePermissionMutation = useDeletePermission();

  const handleDelete = () => {
    toast.promise(deletePermissionMutation.mutateAsync(permission.name), {
      loading: "กำลังลบ permission...",
      success: () => {
        setOpen(false);
        return "ลบ permission สำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="ลบ permission"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบ permission</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบ permission &quot;{permission.name}&quot; ใช่หรือไม่?
            หากมี role ที่ใช้ permission นี้อยู่ จะถูกถอดออกจากทุก role โดยอัตโนมัติ
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deletePermissionMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบ permission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
