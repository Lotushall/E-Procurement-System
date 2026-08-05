"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { VendorDocument } from "@/lib/vendor/profile/types";
import { useDeleteVendorDocument } from "@/lib/vendor/profile/mutations/useDeleteVendorDocument";
import { Trash2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteDocumentDialog({
  document,
}: {
  document: VendorDocument;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorDocumentMutation = useDeleteVendorDocument();

  const handleDelete = () => {
    toast.promise(deleteVendorDocumentMutation.mutateAsync(document.id), {
      loading: "กำลังลบเอกสาร...",
      success: () => {
        setOpen(false);
        return "ลบเอกสารสำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ลบไฟล์"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบเอกสาร</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบเอกสาร &quot;{document.fileName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteVendorDocumentMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบเอกสาร
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
