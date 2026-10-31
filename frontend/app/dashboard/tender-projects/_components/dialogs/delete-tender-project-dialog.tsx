"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteTenderProject } from "@/lib/tender/tender-projects/mutations/useDeleteTenderProject";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeleteTenderProjectDialog({
    tenderProjectId,
    displayName,
    trigger,
    triggerChildren,
    open: controlledOpen,
    onOpenChange,
    onSuccess,
}: {
    tenderProjectId: number;
    displayName: string;
    // ไม่ส่ง trigger เมื่อเปิดจากที่อื่น (เช่นเมนู ⋯ ในการ์ด) — ส่ง open/onOpenChange มาแทน
    trigger?: ReactElement;
    triggerChildren?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = (next: boolean) => (isControlled ? onOpenChange?.(next) : setUncontrolledOpen(next));
    const deleteTenderProjectMutation = useDeleteTenderProject();

    const handleDelete = () => {
        toast.promise(deleteTenderProjectMutation.mutateAsync(tenderProjectId), {
            loading: "กำลังลบโครงการ...",
            success: () => {
                setOpen(false);
                onSuccess?.();
                return "ลบโครงการสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            {trigger && <AlertDialogTrigger render={trigger}>{triggerChildren}</AlertDialogTrigger>}

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบโครงการ</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบโครงการ &quot;{displayName}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteTenderProjectMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบโครงการ
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
