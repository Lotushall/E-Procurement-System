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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@/lib/auth/queries/useUser";
import { useDeleteUser } from "@/lib/user/management/mutations/useDeleteUser";
import type { UserListItem } from "@/lib/user/management/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeleteUserDialog({
  user,
  onDeleted,
}: {
  user: UserListItem;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: currentUser } = useUser();
  const deleteUserMutation = useDeleteUser();
  const disabledReason =
    currentUser?.id === user.id ? "ไม่สามารถลบบัญชีของตัวเองได้" : undefined;

  const handleDelete = () => {
    toast.promise(deleteUserMutation.mutateAsync(user.id), {
      loading: "กำลังลบผู้ใช้...",
      success: () => {
        setOpen(false);
        onDeleted?.();
        return "ลบผู้ใช้สำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  const trigger = (
    <AlertDialogTrigger
      render={
        <Button
          variant="outline"
          aria-label="ลบ user"
          disabled={!!disabledReason}
          className="size-8 px-1.5 pt-px rounded-md bg-white disabled:cursor-not-allowed"
        />
      }
    >
      <Trash2 className="w-4 h-4 text-red-600" />
    </AlertDialogTrigger>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
            {trigger}
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้ใช้</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ใช้ &quot;{user.username}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteUserMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบผู้ใช้
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
