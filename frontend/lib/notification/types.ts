export type NotificationType =
  | "vendor_document_approved"
  | "vendor_document_rejected"
  | "vendor_profile_approved"
  | "vendor_profile_rejected";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: NotificationListMeta;
}
