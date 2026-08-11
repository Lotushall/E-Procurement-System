# Notification center: dropdown จริง + หน้า /notifications (frontend only)

Date: 2026-08-11
Status: Draft — รอ backend ทำ read-side API ตาม contract ด้านล่าง (แยกเป็นอีก plan/session)

## บริบท / ปัญหา

Backend มี notification "send-side" ครบแล้ว (`2026-08-08-vendor-notification-system-design.md`,
`2026-08-10-notification-module-design.md`, `2026-08-11-vendor-approval-notification-wiring-design.md`) —
เวลา admin approve/reject โปรไฟล์หรือเอกสารผู้ค้า จะมี record ถูกสร้างในตาราง `notifications` (Laravel
database notifications มาตรฐาน, `notifiable` เป็น `User`) พร้อมส่งอีเมลด้วยถ้าเลือกไว้

แต่ **ไม่มี read-side API เลย** (list/unread-count/mark-as-read) — ยืนยันแล้วใน
`2026-08-10-notification-module-design.md` ว่าเป็นงานแยกในอนาคต ("ไม่ทำ read-side API")

`components/navbar.tsx`'s `NotificationMenu()` (จาก `2026-07-25-navbar-notification-dropdown-design.md`)
ตอนนี้แสดงแค่ checklist ความครบถ้วนโปรไฟล์ (derived state ล้วน ๆ จาก `useVendorProfileCompleteness()`
ไม่มี persisted record) งานนี้คือเอา notification จริงจาก backend เข้ามาผสมในกระดิ่งเดียวกัน บวกหน้า
"ดูทั้งหมด" ใหม่

**ตกลงกับ user แล้ว:**
- แยกเป็น 2 plan คนละฝั่ง (backend ทำ API, frontend ทำ UI) — spec นี้คือฝั่ง frontend, ออกแบบ UI/UX ก่อน
  แล้วค่อย derive API contract ให้ backend ทำตาม (อยู่ท้าย spec นี้)
- Real notification ผสมเข้าไปใน dropdown เดียวกับ checklist เดิม (ไม่แยก tab)
- มีหน้า `/notifications` แยกดูประวัติทั้งหมดแบบ pagination
- Mark-as-read: อัตโนมัติเมื่อคลิกรายการ (ไม่มีปุ่ม "อ่าน" แยก) + ปุ่ม "อ่านทั้งหมด"
- คลิกรายการ = mark read + เด้งไปหน้าที่เกี่ยวข้อง
- Badge บนกระดิ่งเป็นตัวเลขจริง (unread count) ไม่ใช่จุดแดงเฉย ๆ เหมือนเดิม
- ไม่มี websocket/real-time push ตอนนี้ (ระบบรันบน VPS + cPanel — เทคนิคทำได้แต่ต้องตั้ง infra เพิ่ม
  นอกเหนือจาก Laravel/Next.js ธรรมดา เป็นงานคนละ layer) ใช้ **polling ทุก 3 นาที** สำหรับ unread count
  แทน

## Out of scope

- Backend implementation ของ API ด้านล่าง — spec/plan แยกต่างหาก, spec นี้ออกแบบเผื่อไว้ล่วงหน้าเท่านั้น
- Websocket/real-time push (Laravel Reverb ฯลฯ) — ต้องมี infra setup เพิ่มบน VPS ก่อน (Supervisor, เปิด
  port, reverse proxy) ไม่ทำตอนนี้
- Checkbox "ส่งอีเมลด้วย" ตอน approve/reject (ฝั่ง admin) — คนละงานกับที่นี่ (ดู out-of-scope ใน
  `2026-08-11-vendor-approval-notification-wiring-design.md`)
- Notification ประเภทใหม่ที่ backend ยังไม่ส่ง (เช่นแจ้งเตือน staff) — ออกแบบ mapping type→UI แบบ
  extensible ไว้ แต่ไม่ implement ของที่ backend ไม่มีจริง
- `/dashboard/notifications` แยกสำหรับ internal staff — ทุก notification type ปัจจุบันส่งหา vendor
  เท่านั้น วาง route ไว้ที่ `(public)/notifications` ก่อน ถ้ามี type สำหรับ staff ในอนาคตค่อยเพิ่ม route
  แยกที่ reuse hooks/components ชุดเดียวกัน

## API contract ที่ต้องการจาก backend (ให้ backend spec ทำตามนี้)

Auth เดิม (Sanctum cookie, `auth` middleware) — ทุก endpoint ผูกกับ user ที่ login โดยไม่ต้องรับ id มาเอง

**`GET /api/v1/notifications?page=1&per_page=10`**
```jsonc
{
  "data": [
    {
      "id": "uuid",
      "type": "vendor_document_rejected", // | vendor_document_approved | vendor_profile_approved | vendor_profile_rejected
      "message": "เอกสาร...ของคุณถูกปฏิเสธ: ...", // ข้อความสำเร็จรูป แสดงตรง ๆ ไม่ต้อง compose เอง
      "readAt": null, // ISO datetime หรือ null
      "createdAt": "2026-08-11T09:00:00Z"
    }
  ],
  "meta": { "currentPage": 1, "lastPage": 3, "perPage": 10, "total": 25 }
}
```
ไม่ต้องส่ง `document_type`/`remark` แยก field — `message` รวมไว้ให้แล้วจาก backend (ดู
`toDatabase()` ใน notification classes), frontend map `type` → ไอคอน/สี/ลิงก์เองทั้งหมด (ตารางด้านล่าง)

**`GET /api/v1/notifications/unread-count`** → `{ "data": { "count": 3 } }` — endpoint แยกเบา ๆ
สำหรับ poll ทุก 3 นาทีโดยไม่โหลด list เต็ม

**`PATCH /api/v1/notifications/{id}/read`** → mark รายการเดียว, 204 No Content

**`PATCH /api/v1/notifications/read-all`** → mark ทั้งหมดของ user นั้น, 204 No Content

### Type → ไอคอน/สี/ลิงก์ (ฝั่ง frontend ล้วน ๆ ไม่พึ่ง backend ส่ง URL)

| `type` | ไอคอน | โทนสี | ลิงก์ปลายทาง |
|---|---|---|---|
| `vendor_document_approved` | `CheckCircle2` | เขียว (success) | `routes.profiles.document` |
| `vendor_document_rejected` | `XCircle` | แดง (danger) | `routes.profiles.document` |
| `vendor_profile_approved` | `CheckCircle2` | เขียว (success) | `routes.profiles.profile` |
| `vendor_profile_rejected` | `XCircle` | แดง (danger) | `routes.profiles.profile` |

## Part 1: `lib/notification/` (ใหม่ทั้งโฟลเดอร์)

```
lib/notification/
  types.ts
  api.ts
  utils.ts
  queries/useNotifications.ts
  queries/useUnreadNotificationCount.ts
  mutations/useMarkNotificationRead.ts
  mutations/useMarkAllNotificationsRead.ts
```

`types.ts`:
```ts
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

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}
```

`api.ts` (ตาม pattern ของ `lib/vendor/profile/api.ts` — axios instance กลาง, unwrap envelope เอง):
```ts
export async function fetchNotifications(page: number, perPage: number): Promise<PaginatedNotifications> {
  const { data } = await api.get<PaginatedNotifications>("/api/v1/notifications", {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<{ data: { count: number } }>("/api/v1/notifications/unread-count");
  return data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/api/v1/notifications/read-all");
}
```

`utils.ts` — mapping ตารางด้านบน + format เวลาแบบสัมพัทธ์:
```ts
export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: LucideIcon; tone: "success" | "danger"; href: string }
> = {
  vendor_document_approved: { icon: CheckCircle2, tone: "success", href: routes.profiles.document },
  vendor_document_rejected: { icon: XCircle, tone: "danger", href: routes.profiles.document },
  vendor_profile_approved: { icon: CheckCircle2, tone: "success", href: routes.profiles.profile },
  vendor_profile_rejected: { icon: XCircle, tone: "danger", href: routes.profiles.profile },
};

export function formatNotificationTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: th });
}
```
(`date-fns` v4 เป็น dependency อยู่แล้ว, locale `th` มาจาก `date-fns/locale`)

`queries/useNotifications.ts`:
```ts
export function useNotifications(page: number, perPage: number) {
  return useQuery({
    queryKey: ["notifications", "list", page, perPage],
    queryFn: () => fetchNotifications(page, perPage),
  });
}
```
Dropdown เรียก `useNotifications(1, 5)`, หน้า `/notifications` เรียก `useNotifications(page, 15)`
(page มาจาก `?page=` query param)

`queries/useUnreadNotificationCount.ts`:
```ts
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 3 * 60 * 1000,
    retry: false, // fail เงียบ ๆ ไม่ block bell icon
  });
}
```

`mutations/useMarkNotificationRead.ts` — optimistic update:
- `onMutate`: snapshot cache เดิม, แล้ว `queryClient.setQueriesData({ queryKey: ["notifications", "list"] }, ...)`
  set `readAt` ของ item ที่ id ตรงกันใน list ทุกหน้าที่ cache ไว้ + `setQueryData(["notifications", "unread-count"], (c) => Math.max(0, c - 1))`
  (เฉพาะกรณี item เดิมยัง unread — ถ้า mark ซ้ำ item ที่อ่านแล้วไม่ลด count ซ้ำ)
- `onError`: rollback จาก snapshot
- `onSettled`: `invalidateQueries({ queryKey: ["notifications"] })` เพื่อ sync กับ server จริง

`mutations/useMarkAllNotificationsRead.ts` — เหมือนกันแต่ set ทุก item เป็น read + count เป็น 0

## Part 2: `components/navbar.tsx` — แก้ `NotificationMenu()`

โครง dropdown เดิมคงไว้ทั้งหมด (checklist array + filter) เพิ่ม:
1. Badge ตัวเลขบนกระดิ่ง แทนจุดแดงเดิม — ใช้ `useUnreadNotificationCount()`:
   ```tsx
   {unreadCount > 0 && (
     <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
       {unreadCount > 99 ? "99+" : unreadCount}
     </span>
   )}
   ```
2. Header เดิมเพิ่มปุ่ม "อ่านทั้งหมด" (แสดงเมื่อ `unreadCount > 0`) เรียก `useMarkAllNotificationsRead().mutate()`
3. หลัง checklist items (ถ้ามี) เพิ่มเส้นคั่น + หัวข้อย่อย "การแจ้งเตือนล่าสุด" + `useNotifications(1, 5).data`
   แต่ละแถว: ไอคอนวงกลม (โทนสีตาม `NOTIFICATION_META[type].tone`) + `message` + `formatNotificationTime(createdAt)`
   + ถ้า `readAt === null` เน้นด้วย `bg-red-50/50` อ่อน ๆ (เทียบ pattern สีแดงเดิมของไฟล์นี้)
4. คลิกแถว notification → `useMarkNotificationRead(id).mutate()` แล้ว `router.push(NOTIFICATION_META[type].href)`
   (ต่าง จาก checklist item ที่เป็นแค่ `<Link>` ธรรมดา เพราะต้อง mutate ก่อน ใช้ `onClick` + `router.push`
   แทน `render={<Link .../>}`)
5. ท้าย dropdown เพิ่มลิงก์ "ดูทั้งหมด" → `/notifications` เสมอ
6. Empty state เดิม ("ไม่มีการแจ้งเตือนใหม่") ใช้เมื่อ checklist ว่าง **และ** `useNotifications(1,5).data` ว่าง
   ทั้งคู่

## Part 3: หน้า `/notifications` ใหม่

```
app/(public)/notifications/
  page.tsx
  _components/notification-list.tsx
  _components/notification-item.tsx
```

วางใน route group `(public)` (ข้าง ๆ `profiles`, `terms`, `privacy`) เพื่อใช้ `(public)/layout.tsx`
เดิม (Navbar ธรรมดา ไม่มี profile sidebar) — ไม่ใช้ `(public)/profiles/layout.tsx` เพราะอันนั้นมี Sidebar
เมนูโปรไฟล์ติดมาด้วยซึ่งไม่เกี่ยวกับหน้านี้

`page.tsx`: อ่าน `page` จาก `searchParams`, เรียก `useNotifications(page, 15)`, render:
- หัวข้อ "การแจ้งเตือน" + ปุ่ม "อ่านทั้งหมด" (แสดงเมื่อ `useUnreadNotificationCount().data > 0` — ใช้ query
  เดียวกับ badge บนกระดิ่งเป็น source of truth เดียว ไม่ derive จาก list ของหน้านี้เพราะ list เป็นแค่หน้า
  ปัจจุบัน ไม่ครอบคลุม unread ทั้งหมดถ้า user อยู่หน้าอื่นที่ไม่ใช่หน้าแรก)
- `NotificationList` (การ์ด ไม่ใช่ data-table) — ทุกรายการ (อ่านแล้ว/ยังไม่อ่านปนกัน), unread เน้น bg อ่อน
- Pagination ปุ่มเลขหน้าง่าย ๆ ท้าย list จาก `meta.currentPage`/`meta.lastPage`
- คลิกรายการ = mark read + navigate เหมือน dropdown (reuse `NOTIFICATION_META`)
- Error state: โหลดพลาด → ข้อความ + ปุ่ม "ลองใหม่" (`refetch()`)
- Loading state: skeleton การ์ด 3-4 แถว

**⚠️ หมายเหตุสำคัญสำหรับตอน implement:** `AGENTS.md` ของโปรเจกต์นี้เตือนว่า Next.js เวอร์ชันนี้มี breaking
changes จาก training data ปกติ — ต้องเช็ค `node_modules/next/dist/docs/01-app/` ก่อนเขียนโค้ดจริงว่า
`searchParams` ใน `page.tsx` เป็น `Promise` หรือ object ตรง ๆ ในเวอร์ชันนี้ (Next 15+ เปลี่ยนเป็น async
prop) ก่อนตัดสินใจ implementation ที่ชัดเจน

## Error handling

- `useUnreadNotificationCount` error → เงียบ ไม่แสดง badge เลย (`retry: false`, ไม่ throw ไม่ block UI อื่น)
- Dropdown list โหลดพลาด → ซ่อนส่วน "การแจ้งเตือนล่าสุด" ไปเลย เหลือแค่ checklist (ถ้ามี) ไม่ error เต็ม dropdown
- หน้า `/notifications` โหลดพลาด → error state เต็มหน้าตามปกติของ react-query
- mark-as-read/mark-all ล้มเหลว → toast ผ่าน `sonner` (มีอยู่แล้ว) + optimistic update rollback อัตโนมัติ

## Testing

ไม่มี browser automation ในสภาพแวดล้อมนี้ ([per memory](project_no_browser_automation.md)) — ตรวจด้วย
`tsc`/lint/build แล้ว disclose manual QA ให้ user ทดสอบเอง:
1. Login เป็น vendor ที่มี unread notification จริง (ต้อง seed/trigger จาก backend endpoint ที่มีอยู่แล้ว
   เช่น approve/reject เอกสาร) → กระดิ่งมีตัวเลข badge ตรงกับ unread count จริง
2. เปิด dropdown → เห็น checklist (ถ้ามี) ตามด้วยเส้นคั่นและ notification 5 รายการล่าสุด เรียงใหม่สุดก่อน
3. คลิก notification ที่ยังไม่อ่าน → badge ลดลง 1 ทันที (optimistic) + เด้งไปหน้าที่ถูกต้องตาม type
4. กด "อ่านทั้งหมด" → badge เป็น 0 ทันที, รายการทั้งหมดหายจากสถานะ unread
5. ไปหน้า `/notifications` → เห็นประวัติทั้งหมด, pagination ทำงานถูกต้อง, คลิกรายการทำงานเหมือน dropdown
6. Login เป็น internal staff (ไม่มี notification จริงเลย) → กระดิ่งไม่มี badge, dropdown โชว์ empty state
   ปกติ ไม่ error
7. ทดสอบ error path: mock/บล็อก request unread-count ชั่วคราว → กระดิ่งไม่มี badge แต่หน้าเว็บใช้งานได้ปกติ
8. เช็คทั้ง light/dark mode
