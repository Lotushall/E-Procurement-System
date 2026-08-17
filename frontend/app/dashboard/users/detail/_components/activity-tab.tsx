import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  KeyRound, LogIn, LogOut, Pencil, ShieldCheck, ShieldOff, ToggleRight, UserCog, type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityType, MockActivity } from "../_data/mock-user-detail";

const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  login: LogIn,
  logout: LogOut,
  password_changed: KeyRound,
  profile_updated: Pencil,
  role_changed: UserCog,
  permission_changed: ShieldCheck,
  status_changed: ToggleRight,
  session_revoked: ShieldOff,
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy, HH:mm", { locale: th });
}

export function ActivityTab({ activity }: { activity: MockActivity[] }) {
  if (activity.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          ยังไม่มีความเคลื่อนไหวของผู้ใช้นี้
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <ul className="flex flex-col">
          {activity.map((item, index) => {
            const Icon = ACTIVITY_ICON[item.type];
            const isLast = index === activity.length - 1;
            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className={`flex flex-col gap-0.5 ${isLast ? "pb-1" : "pb-6"}`}>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.actor} · {item.ip}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
