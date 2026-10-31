"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteVendor } from "@/lib/vendor/approval/mutations/useDeleteVendor";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบผู้ค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeleteVendorDialog({
    vendorId,
    displayName,
    trigger,
    triggerChildren,
    onSuccess,
    open: controlledOpen,
    onOpenChange,
}: {
    vendorId: number;
    displayName: string;
    // ไม่ต้องส่ง trigger เมื่อเปิดจากที่อื่นผ่าน open (เช่นเมนู ⋮ ในการ์ด)
    trigger?: ReactElement;
    triggerChildren?: ReactNode;
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = (next: boolean) => (isControlled ? onOpenChange?.(next) : setUncontrolledOpen(next));
    const deleteVendorMutation = useDeleteVendor();

    const handleDelete = () => {
        toast.promise(deleteVendorMutation.mutateAsync(vendorId), {
            loading: "กำลังลบผู้ค้า...",
            success: () => {
                setOpen(false);
                onSuccess?.();
                return "ลบผู้ค้าสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            {trigger && <AlertDialogTrigger render={trigger}>{triggerChildren}</AlertDialogTrigger>}

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบผู้ค้า</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบผู้ค้า &quot;{displayName}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteVendorMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบผู้ค้า
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
