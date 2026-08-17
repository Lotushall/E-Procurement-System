import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNotificationTime } from "@/lib/notification/utils";
import type { UserStatus, UserType } from "@/lib/user/management/types";
import { formatCitizenId, maskCitizenId } from "@/lib/utils";
import type { MockUserDetail } from "../_data/mock-user-detail";

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

export function OverviewTab({ user, status }: { user: MockUserDetail; status: UserStatus }) {
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
            <InfoRow label="การยืนยันอีเมล" value={<VerifiedBadge verified={user.emailVerified} />} />
            <InfoRow label="วันที่สร้างบัญชี" value={formatDate(user.createdAt)} />
            <InfoRow label="แก้ไขล่าสุด" value={formatDate(user.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {user.userType === "internal" && (
              <>
                <InfoRow label="รหัสพนักงาน" value={user.profile.employeeNo} />
                <InfoRow
                  label="ชื่อ-นามสกุล"
                  value={`${user.profile.prefix}${user.profile.firstname} ${user.profile.lastname}`}
                />
                <InfoRow label="แผนก" value={user.profile.department} />
                <InfoRow label="ตำแหน่ง" value={user.profile.position} />
                <InfoRow label="เบอร์โทร" value={user.profile.phone} />
              </>
            )}
            {user.userType === "company" && (
              <>
                <InfoRow label="ชื่อบริษัท" value={user.profile.companyName} />
                <InfoRow label="เลขประจำตัวผู้เสียภาษี" value={formatCitizenId(user.profile.taxId)} />
                <InfoRow label="ผู้ติดต่อ" value={user.profile.contactName} />
                <InfoRow label="เบอร์โทรผู้ติดต่อ" value={user.profile.contactPhone} />
              </>
            )}
            {user.userType === "individual" && (
              <>
                <InfoRow label="ชื่อ-นามสกุล" value={user.profile.fullName} />
                <InfoRow label="เลขบัตรประชาชน" value={maskCitizenId(user.profile.nationalId)} />
                <InfoRow label="เบอร์โทร" value={user.profile.phone} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ความปลอดภัย</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="การยืนยันอีเมล" value={<VerifiedBadge verified={user.emailVerified} />} />
          <InfoRow
            label="เข้าสู่ระบบล่าสุด"
            value={
              <Tooltip>
                <TooltipTrigger render={<span className="cursor-default" />}>
                  {formatNotificationTime(user.lastLoginAt)}
                </TooltipTrigger>
                <TooltipContent>{formatDate(user.lastLoginAt)}</TooltipContent>
              </Tooltip>
            }
          />
          <InfoRow
            label="เปลี่ยนรหัสผ่านล่าสุด"
            value={formatNotificationTime(user.passwordChangedAt)}
          />
          <InfoRow
            label="ยืนยันตัวตนสองขั้นตอน (2FA)"
            value={
              user.twoFactorEnabled ? (
                <Badge className="bg-green-700/15 text-green-800">เปิดใช้งาน</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">ปิดใช้งาน</Badge>
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
