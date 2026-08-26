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
import { useDeletePosition } from "@/lib/internal-profiles/mutations/useDeletePosition";
import type { Position } from "@/lib/internal-profiles/types";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบตำแหน่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeletePositionDialog({ position }: { position: Position }) {
    const [open, setOpen] = useState(false);
    const deletePositionMutation = useDeletePosition();

    const handleDelete = () => {
        toast.promise(deletePositionMutation.mutateAsync(position.id), {
            loading: "กำลังลบตำแหน่ง...",
            success: () => {
                setOpen(false);
                return "ลบตำแหน่งสำเร็จ";
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
                        aria-label="ลบตำแหน่ง"
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    />
                }
            >
                <Trash2 className="w-4 h-4 text-red-600" />
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบตำแหน่ง</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบตำแหน่ง &quot;{position.name}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deletePositionMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบตำแหน่ง
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
