import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { routes } from "@/lib/routes";
import type { NotificationType } from "@/lib/notification/types";

interface NotificationMeta {
  icon: LucideIcon;
  tone: "success" | "danger";
  href: string;
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  vendor_document_approved: {
    icon: CheckCircle2,
    tone: "success",
    href: routes.profiles.document,
  },
  vendor_document_rejected: {
    icon: XCircle,
    tone: "danger",
    href: routes.profiles.document,
  },
  vendor_profile_approved: {
    icon: CheckCircle2,
    tone: "success",
    href: routes.profiles.profile,
  },
  vendor_profile_rejected: {
    icon: XCircle,
    tone: "danger",
    href: routes.profiles.profile,
  },
};

export function formatNotificationTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: th });
}
