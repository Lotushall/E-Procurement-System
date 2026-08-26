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
import { useDeleteDepartment } from "@/lib/internal-profiles/mutations/useDeleteDepartment";
import type { Department } from "@/lib/internal-profiles/types";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteDepartmentDialog({ department }: { department: Department }) {
    const [open, setOpen] = useState(false);
    const deleteDepartmentMutation = useDeleteDepartment();

    const handleDelete = () => {
        toast.promise(deleteDepartmentMutation.mutateAsync(department.id), {
            loading: "กำลังลบแผนก...",
            success: () => {
                setOpen(false);
                return "ลบแผนกสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    <Button
                        variant="outline"
                        aria-label="ลบแผนก"
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    />
                }
            >
                <Trash2 className="w-4 h-4 text-red-600" />
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบแผนก</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบแผนก &quot;{department.name}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteDepartmentMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบแผนก
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
