"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Laptop, MapPin, MonitorSmartphone, ShieldOff, Smartphone } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatNotificationTime } from "@/lib/notification/utils";
import { useUserSessions } from "@/lib/user/management/queries/useUserSessions";
import { useRevokeUserSession } from "@/lib/user/management/mutations/useRevokeUserSession";
import { useRevokeAllUserSessions } from "@/lib/user/management/mutations/useRevokeAllUserSessions";
import type { SessionInfo } from "@/lib/user/management/types";

type ConfirmState =
  | { type: "single"; session: SessionInfo }
  | { type: "others" }
  | { type: "all" }
  | null;

function DeviceIcon({ device }: { device: SessionInfo["device"] }) {
  if (device === "Mobile" || device === "Tablet") return <Smartphone className="size-5" />;
  return <Laptop className="size-5" />;
}

export function SessionsTab({ userId }: { userId: number }) {
  const { data: sessions, isPending, isError } = useUserSessions(userId);
  const revokeOne = useRevokeUserSession(userId);
  const revokeAll = useRevokeAllUserSessions(userId);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !sessions) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่สามารถโหลดรายการ session ได้ กรุณาลองใหม่อีกครั้ง
      </p>
    );
  }

  const otherSessionsCount = sessions.filter((session) => !session.current).length;

  const handleConfirm = () => {
    if (!confirm) return;

    if (confirm.type === "single") {
      toast.promise(revokeOne.mutateAsync(confirm.session.id), {
        loading: "กำลังเพิกถอน session...",
        success: "เพิกถอน session แล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    } else if (confirm.type === "others") {
      toast.promise(revokeAll.mutateAsync(true), {
        loading: "กำลังเพิกถอน session อื่นทั้งหมด...",
        success: "เพิกถอน session อื่นทั้งหมดแล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    } else {
      toast.promise(revokeAll.mutateAsync(false), {
        loading: "กำลังเพิกถอน session ทั้งหมด...",
        success: "เพิกถอน session ทั้งหมดแล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    }
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium">Active Sessions ({sessions.length})</h3>
        {sessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherSessionsCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setConfirm({ type: "others" })}>
                เพิกถอน session อื่นทั้งหมด
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirm({ type: "all" })}
            >
              เพิกถอน session ทั้งหมด
            </Button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <MonitorSmartphone className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">ไม่มี session ที่ใช้งานอยู่</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <DeviceIcon device={session.device} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {session.browser} · {session.os}
                      </span>
                      {session.current && (
                        <Badge className="bg-green-700/15 text-green-800">เซสชันปัจจุบัน</Badge>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {session.ipAddress}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ใช้งานล่าสุด {formatNotificationTime(session.lastActiveAt)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirm({ type: "single", session })}
                >
                  <ShieldOff />
                  เพิกถอน
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm?.type === "single" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>เพิกถอน Session</AlertDialogTitle>
                <AlertDialogDescription>
                  ต้องการเพิกถอน session นี้ใช่หรือไม่? ({confirm.session.browser} · {confirm.session.os} ·{" "}
                  {confirm.session.ipAddress}) ผู้ใช้จะต้องเข้าสู่ระบบใหม่บนอุปกรณ์นี้
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleConfirm}>
                  เพิกถอน Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirm?.type === "others" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>เพิกถอน Session อื่นทั้งหมด</AlertDialogTitle>
                <AlertDialogDescription>
                  การดำเนินการนี้จะออกจากระบบผู้ใช้จากทุกอุปกรณ์ ยกเว้นอุปกรณ์ปัจจุบัน ({otherSessionsCount} session
                  จะถูกเพิกถอน)
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleConfirm}>
                  เพิกถอน Session อื่นทั้งหมด
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirm?.type === "all" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>เพิกถอน Session ทั้งหมด</AlertDialogTitle>
                <AlertDialogDescription>
                  การดำเนินการนี้จะออกจากระบบผู้ใช้จากทุกอุปกรณ์ที่ใช้งานอยู่ ({sessions.length} session จะถูกเพิกถอน)
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={handleConfirm}>
                  เพิกถอน Session ทั้งหมด
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
