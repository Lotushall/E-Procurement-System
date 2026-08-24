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
import { useDeleteInternalProfile } from "@/lib/internal-profiles/mutations/useDeleteInternalProfile";
import type { InternalProfile } from "@/lib/internal-profiles/types";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteInternalProfileDialog({
    internal_profile,
}: {
    internal_profile: InternalProfile;
}) {
    const [open, setOpen] = useState(false);
    const { data: currentUser } = useUser();
    const deleteInternalProfileMutation = useDeleteInternalProfile();
    const disabledReason =
        currentUser?.id === internal_profile.userId
            ? "ไม่สามารถลบบัญชีของตัวเองได้"
            : undefined;

    const fullName = `${internal_profile?.prefix ?? ""}${internal_profile.firstname} ${internal_profile.lastname}`;

    const handleDelete = () => {
        toast.promise(deleteInternalProfileMutation.mutateAsync(internal_profile.id), {
            loading: "กำลังลบพนักงาน...",
            success: () => {
                setOpen(false);
                return "ลบพนักงานสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    const trigger = (
        <AlertDialogTrigger
            render={
                <Button
                    variant="outline"
                    aria-label="ลบพนักงาน"
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
                    <AlertDialogTitle>ลบพนักงาน</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบพนักงาน &quot;{fullName}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteInternalProfileMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบพนักงาน
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
