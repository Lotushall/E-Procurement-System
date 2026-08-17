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
import { formatNotificationTime } from "@/lib/notification/utils";
import type { MockSession } from "../_data/mock-user-detail";

type ConfirmState =
  | { type: "single"; session: MockSession }
  | { type: "others" }
  | { type: "all" }
  | null;

function DeviceIcon({ device }: { device: string }) {
  if (/iphone|android|smartphone/i.test(device)) return <Smartphone className="size-5" />;
  return <Laptop className="size-5" />;
}

export function SessionsTab({ sessions: initialSessions }: { sessions: MockSession[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const otherSessionsCount = sessions.filter((session) => !session.current).length;

  const handleConfirm = () => {
    if (!confirm) return;

    if (confirm.type === "single") {
      setSessions((prev) => prev.filter((session) => session.id !== confirm.session.id));
      toast.success("เพิกถอน session แล้ว");
    } else if (confirm.type === "others") {
      setSessions((prev) => prev.filter((session) => session.current));
      toast.success("เพิกถอน session อื่นทั้งหมดแล้ว");
    } else {
      setSessions([]);
      toast.success("เพิกถอน session ทั้งหมดแล้ว");
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
                    <span className="text-xs text-muted-foreground">
                      {session.device} · {session.ip}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {session.location}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ใช้งานล่าสุด {formatNotificationTime(session.lastActiveAt)} · เข้าสู่ระบบ{" "}
                      {formatNotificationTime(session.loginAt)}
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
                  {confirm.session.ip}) ผู้ใช้จะต้องเข้าสู่ระบบใหม่บนอุปกรณ์นี้
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
