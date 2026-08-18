"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, MoreHorizontal, Pencil, PlayCircle, ShieldOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserStatusBadge } from "@/components/user-status-badge";
import type { UserDetail, UserStatus } from "@/lib/user/management/types";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";

export function UserDetailHeader({
  user,
  status,
  onStatusChange,
}: {
  user: UserDetail;
  status: UserStatus;
  onStatusChange: (status: UserStatus) => void;
}) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isSuspended = status === "suspended";

  const handleResetPassword = () => {
    toast.success(`ส่งอีเมลรีเซ็ตรหัสผ่านไปที่ ${user.email} แล้ว`);
  };

  const handleActivate = () => {
    onStatusChange("active");
    toast.success("เปิดใช้งานบัญชีนี้แล้ว");
  };

  const handleSuspend = () => {
    onStatusChange("suspended");
    setSuspendOpen(false);
    toast.success("ระงับการใช้งานบัญชีนี้แล้ว");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(user.name)}
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.username} · {user.email}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <UserStatusBadge status={status} />
            <div className="h-4" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={<Link href={routes.dashboards.user.edit(user.id)} />}
            nativeButton={false}
          >
            <Pencil />
            แก้ไข
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" aria-label="ตัวเลือกเพิ่มเติม" />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleResetPassword}>
                <KeyRound />
                รีเซ็ตรหัสผ่าน
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isSuspended ? (
                <DropdownMenuItem onClick={handleActivate}>
                  <PlayCircle />
                  เปิดใช้งานบัญชี
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onClick={() => setSuspendOpen(true)}>
                  <ShieldOff />
                  ระงับการใช้งานบัญชี
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ระงับการใช้งานบัญชี</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการระงับการใช้งานบัญชีของ &quot;{user.name}&quot; ใช่หรือไม่? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleSuspend}>
              ระงับการใช้งาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
