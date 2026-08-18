import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNotificationTime } from "@/lib/notification/utils";
import type { UserDetail, UserStatus, UserType } from "@/lib/user/management/types";

const USER_TYPE_LABEL: Record<UserType, string> = {
  internal: "พนักงานภายใน",
  company: "นิติบุคคล",
  individual: "ร้านค้า",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd-MM-yyyy", { locale: th });
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge className="bg-green-700/15 text-green-800">ยืนยันแล้ว</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">ยังไม่ยืนยัน</Badge>
  );
}

export function OverviewTab({ user, status }: { user: UserDetail; status: UserStatus }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลบัญชี</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="อีเมล" value={user.email} />
            <InfoRow label="ประเภทผู้ใช้" value={USER_TYPE_LABEL[user.userType]} />
            <InfoRow label="สถานะ" value={<Badge variant="outline" className="capitalize">{status}</Badge>} />
            <InfoRow label="การยืนยันอีเมล" value={<VerifiedBadge verified={user.emailVerifiedAt !== null} />} />
            <InfoRow label="วันที่สร้างบัญชี" value={formatDate(user.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {user.userType === "internal" && user.internalProfile ? (
              <>
                <InfoRow label="รหัสพนักงาน" value={user.internalProfile.employeeNo ?? "-"} />
                <InfoRow
                  label="ชื่อ-นามสกุล"
                  value={`${user.internalProfile.prefix ?? ""}${user.internalProfile.firstname} ${user.internalProfile.lastname}`}
                />
                <InfoRow label="แผนก" value={user.internalProfile.department ?? "-"} />
                <InfoRow label="ตำแหน่ง" value={user.internalProfile.position ?? "-"} />
                <InfoRow label="เบอร์โทร" value={user.internalProfile.phone ?? "-"} />
              </>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">ไม่มีข้อมูลส่วนตัวเพิ่มเติมสำหรับผู้ใช้ประเภทนี้</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ความปลอดภัย</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="การยืนยันอีเมล" value={<VerifiedBadge verified={user.emailVerifiedAt !== null} />} />
          <InfoRow
            label="เข้าสู่ระบบล่าสุด"
            value={
              user.lastLoginAt ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-default" />}>
                    {formatNotificationTime(user.lastLoginAt)}
                  </TooltipTrigger>
                  <TooltipContent>{formatDate(user.lastLoginAt)}</TooltipContent>
                </Tooltip>
              ) : (
                "ยังไม่เคยเข้าสู่ระบบ"
              )
            }
          />
          <InfoRow
            label="เปลี่ยนรหัสผ่านล่าสุด"
            value={user.passwordChangedAt ? formatNotificationTime(user.passwordChangedAt) : "ยังไม่เคยเปลี่ยนรหัสผ่าน"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
