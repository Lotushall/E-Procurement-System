import { Bell, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
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

const FALLBACK_NOTIFICATION_META: NotificationMeta = {
  icon: Bell,
  tone: "success",
  href: routes.notifications,
};

export function getNotificationMeta(type: NotificationType): NotificationMeta {
  return NOTIFICATION_META[type] ?? FALLBACK_NOTIFICATION_META;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatDistanceToNow(date, { addSuffix: true, locale: th });
}
