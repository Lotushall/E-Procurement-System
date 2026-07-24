"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VendorContact } from "@/lib/vendor/types";
import { useDeleteVendorContact } from "@/lib/vendor/mutations";
import { Trash2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteContactDialog({
  contact,
  disabledReason,
}: {
  contact: VendorContact;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorContactMutation = useDeleteVendorContact();

  const handleDelete = () => {
    toast.promise(deleteVendorContactMutation.mutateAsync(contact.id), {
      loading: "กำลังลบผู้ติดต่อ...",
      success: () => {
        setOpen(false);
        return "ลบข้อมูลผู้ติดต่อสำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  const trigger = (
    <AlertDialogTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          aria-label="ลบผู้ติดต่อ"
          disabled={!!disabledReason}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
        />
      }
    >
      <Trash2 />
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
          <AlertDialogTitle>ลบผู้ติดต่อ</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ติดต่อ &quot;{contact.contactName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteVendorContactMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบผู้ติดต่อ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
