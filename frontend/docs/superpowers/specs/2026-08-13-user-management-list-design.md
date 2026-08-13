# User management: รายชื่อ + รายละเอียด + เชื่อมโยงกับ Vendor (frontend only)

Date: 2026-08-13
Status: Draft — รอ backend ทำ API ตาม contract ด้านล่าง (แยกเป็นอีก plan)

## บริบท / ขอบเขตใหญ่

หน้า "จัดการผู้ใช้" (`จัดการผู้ใช้` ใน sidebar, route `/dashboard/users`) ที่ผู้ใช้ต้องการ ครอบคลุมความสามารถ 4 อย่าง ซึ่งเป็นคนละ sub-project กัน:

1. **ดูรายชื่อ user ทั้งหมด + ค้นหา/กรอง** ← **spec นี้ทำเฉพาะข้อนี้**
2. เปลี่ยนสถานะ user (ระงับ/เปิดใช้งาน) — sub-project แยก ในอนาคต
3. สร้าง internal user ใหม่ — sub-project แยก ในอนาคต
4. จัดการ role/permission ของ internal staff — sub-project แยก ในอนาคต (backend มีแค่ role `admin` เดียวตอนนี้ ต้องออกแบบ role/permission ใหม่ก่อน)

ตกลงกับ user แล้วว่าเริ่มจากข้อ 1 ก่อนเพราะเป็นฐานที่ข้ออื่นต้องพึ่งพา (ต้องเห็น user ก่อนถึงจะกดเปลี่ยนสถานะ/มอบ role ได้)

**ยังไม่มี backend API สำหรับ user-management เลยแม้แต่ endpoint เดียว** — มีแค่ตาราง `users`/`internal_profiles` และระบบ role/permission (spatie) ที่ผูกไว้แล้วเฉยๆ ไม่มี route/controller/use-case ใดๆ (`UserController.php` ที่มีอยู่เป็น scaffold ตายไม่ได้ผูก route) ตกลงแบบเดียวกับ notification-center: **ออกแบบ UI/UX ก่อน แล้ว derive API contract ให้ backend ทำตามเป็นอีก plan**

**WIP ที่ค้างอยู่ก่อน spec นี้ (ยังไม่ commit):** nav item "จัดการผู้ใช้" ใน `app/dashboard/_components/app-sidebar.tsx`, route `routes.dashboards.user.index = "/dashboard/users"` ใน `lib/routes.ts` (มี `import { Users } from "lucide-react"` ที่ไม่ได้ใช้ค้างอยู่ด้วย — dead code, ลบตอน implement), และ stub page ว่างเปล่าที่ `app/dashboard/users/page.tsx`

## ขอบเขตของ spec นี้ (ยืนยันกับ user แล้ว)

- **ครอบคลุม user ทุกประเภท** (internal/company/individual) ในตารางเดียว มี filter เลือกประเภทได้ — ไม่ใช่เฉพาะ internal staff เท่านั้น แม้ user ประเภท company/individual จะซ้อนทับกับสิ่งที่หน้า Vendor list ทำอยู่แล้วก็ตาม (เป็น "มุมมองบัญชีทั้งหมด" แยกจาก "มุมมองงาน approve/reject vendor")
- **มีหน้า User detail แบบ read-only** (ตัดสินใจใหม่ระหว่างคุย — ตอนแรกจะเอาแค่ตารางแต่ user ขอเพิ่มเพื่อทำการเชื่อมโยงกับ Vendor detail) — ไม่มีปุ่ม action ใดๆ (เปลี่ยนสถานะ/แก้ไข เป็น sub-project อื่น)
- **เชื่อมโยง Vendor ↔ User สองทาง**: User detail → Vendor detail (ถ้าเป็น vendor), และ Vendor detail (หน้าเดิม) → User detail (เสมอ เพราะทุก vendor มี user account)

## Out of scope

- เปลี่ยนสถานะ user (suspend/activate), สร้าง internal user ใหม่, จัดการ role/permission — 3 sub-project ที่เหลือ เป็น spec/plan แยกในอนาคต
- Action ใดๆ บนหน้า User detail หรือ Users table (ไม่มีปุ่มแก้ไข/ลบ/เปลี่ยนสถานะ) — เฉพาะ read + navigate เท่านั้น
- Backend implementation ของ API ด้านล่าง — spec/plan แยกต่างหาก
- แก้ไข Vendor list/detail page นอกเหนือจากลิงก์เล็กๆ ไป User detail ที่ระบุไว้ — ไม่แตะ layout/logic อื่นของหน้านั้น
- Permission-based hiding ของ sidebar item "จัดการผู้ใช้" (ตอนนี้ gate แค่ระดับ `userType === "internal"` เหมือนเมนูอื่น ยังไม่มี fine-grained permission check เพราะ role/permission ของ user-management ยังไม่ถูกออกแบบ)

## API contract ที่ต้องการจาก backend (ให้ backend spec ทำตามนี้)

Auth เดิม (Sanctum cookie), gate ด้วย `userType === "internal"` ระดับ route เหมือน vendor dashboard — ส่วน permission ละเอียดกว่านั้น (เช่น `users.view`) รอ sub-project ข้อ 4

**1. `GET /api/v1/dashboard/users?type=&status=&search=&page=1&per_page=20&sort_by=&sort_direction=`**
```jsonc
{
  "data": [
    {
      "id": 1,
      "username": "somchai",
      "email": "somchai@example.com",
      "name": "สมชาย ใจดี", // resolve แล้วฝั่ง backend (internal_profiles ต่อกัน หรือ vendor company/store name)
      "userType": "internal", // internal | company | individual
      "status": "active",     // pending | active | suspended | inactive
      "createdAt": "2026-08-01T09:00:00Z"
    }
  ],
  "meta": { "currentPage": 1, "lastPage": 5, "perPage": 20, "total": 92 }
}
```
`type`/`status` เป็น optional filter (ไม่ส่ง = ทั้งหมด), `search` ค้นจาก username/email/name, `sort_by` รองรับ `created_at` | `username` | `email` เท่านั้น (ตัด `name` ออกเพราะ join มาจากคนละตารางตามประเภท sort ยาก)

**2. `GET /api/v1/dashboard/users/{id}`**
```jsonc
{
  "data": {
    "id": 1,
    "username": "somchai",
    "email": "somchai@example.com",
    "name": "สมชาย ใจดี",
    "userType": "internal",
    "status": "active",
    "createdAt": "2026-08-01T09:00:00Z",
    "vendorProfileId": null // number ถ้า userType เป็น company/individual, null ถ้า internal — ใช้ลิงก์ไปหน้า Vendor detail
  }
}
```

**3. แก้ `VendorProfileResource` (มีอยู่แล้ว, ใช้กับหน้า Vendor detail) — เพิ่ม `id` เข้าไปใน block `user`**

ปัจจุบัน (`backend/app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php:40-43`):
```php
'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
    'username' => $this->VendorProfilesUser->username,
    'email' => $this->VendorProfilesUser->email,
]),
```
ต้องเพิ่ม `'id' => $this->VendorProfilesUser->id,` เข้าไปในนั้นด้วย — เป็น field เดียวที่ต้องเพิ่มในหน้า Vendor detail เดิม เพื่อให้ frontend ทำลิงก์ `routes.dashboards.user.detail(userId)` ได้

## Part 1: `lib/user/management/` (ใหม่ทั้งโฟลเดอร์)

```
lib/user/management/
  types.ts              # UserListItem, UserDetail, UserType/UserStatus unions, pagination meta
  api.ts                # fetchUserList(...), fetchUserDetail(id)
  queries/useUserList.ts
  queries/useUserDetail.ts
```

โครงสร้าง/pattern เหมือน `lib/vendor/approval/` ทุกอย่าง (queryKey array, `keepPreviousData` สำหรับ list, axios instance กลางจาก `@/lib/api`)

`types.ts`:
```ts
export type UserType = "internal" | "company" | "individual";
export type UserStatus = "pending" | "active" | "suspended" | "inactive";

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  name: string;
  userType: UserType;
  status: UserStatus;
  createdAt: string;
}

export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
}

export interface UserListPagination {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PaginatedUserList {
  data: UserListItem[];
  meta: UserListPagination;
}
```

## Part 2: หน้ารายชื่อ `app/dashboard/users/page.tsx` (แทนที่ stub เดิม)

```
app/dashboard/users/
  page.tsx
  _hooks/use-user-list-page.ts
  _components/
    table/columns.tsx
    user-list-skeleton.tsx
```

`_hooks/use-user-list-page.ts` — ขับ state ผ่าน URL search params ทั้งหมด (`type`, `status`, `search`, `page`, `per_page`, `sort_by`, `sort_direction`) ตาม pattern เดียวกับ `use-vendor-list-page.ts` เป๊ะ (debounce ค้นหา 350ms, `skipSkeleton` ตอน sort/page-only change) — reuse `DataTable`/`DataTablePagination`/`SortableHeader` ของเดิมได้ทั้งหมด ไม่ต้องสร้างใหม่

**ไม่มี stats-cards** (ต่างจาก Vendor list) — ใช้ Select 2 ตัว (ประเภท, สถานะ) + ช่องค้นหาแทน เพราะมี filter 2 มิติพร้อมกัน ทำเป็นการ์ดนับจะซับซ้อนเกินและต้องมี aggregate-count endpoint เพิ่ม

**คอลัมน์ตาราง** (`_components/table/columns.tsx`, `ColumnDef<UserListItem>[]`):
| id | header | เนื้อหา |
|---|---|---|
| `name` | ผู้ใช้ | avatar-initials (`getInitials(name)`) + `name` ตัวหนา + `username` ตัวเล็กใต้ชื่อ (sortable) |
| `user_type` | ประเภท | badge/icon ตาม `USER_TYPE_LABEL` (internal="พนักงานภายใน", company="นิติบุคคล", individual="ร้านค้า" — label เดียวกับใน `ProfileMenu`) |
| `email` | อีเมล | ตรงๆ (sortable) |
| `status` | สถานะ | `UserStatusBadge` (component ใหม่ — ดู Part 4) |
| `created_at` | วันที่สร้าง | `format(new Date(...), "dd-MM-yyyy")` (sortable) |
| `actions` | — | ปุ่มไอคอน (Eye, เหมือน Vendor list) ลิงก์ไป `routes.dashboards.user.detail(row.original.id)` — **ทุกแถว ไม่ว่าประเภทไหน** |

Filter type: `{ value: "all"|"internal"|"company"|"individual", label }[]`, filter status: `{ value: "all"|"pending"|"active"|"suspended"|"inactive", label }[]` — ทั้งสองเป็น `Select` แบบเดียวกับ status select ใน Vendor list

## Part 3: หน้ารายละเอียด `app/dashboard/users/detail/page.tsx` (ใหม่)

```
app/dashboard/users/detail/page.tsx
```

อ่าน `?id=` จาก `useSearchParams` เหมือน `app/dashboard/vendors/detail/page.tsx` เป๊ะ — `"use client"`, default export wrap ด้วย `<Suspense fallback={null}>` ครอบ component ที่เรียก `useSearchParams()` จริง (pattern เดียวกับที่ vendor detail และ `/notifications` ใช้อยู่แล้วในโปรเจกต์นี้ เพราะ Next.js เวอร์ชันนี้ต้องมี Suspense boundary รอบ `useSearchParams`)

Layout: header (avatar-initials + `name` + `username`) + badge ประเภท + badge สถานะ + อีเมล + วันที่สร้าง — read-only ล้วน ไม่มีปุ่ม action ใดๆ

**ปุ่ม "ดูข้อมูลผู้ค้า"** แสดงเมื่อ `vendorProfileId !== null` เท่านั้น → `<Link href={routes.dashboards.vendors.detail(vendorProfileId)}>` (ใช้ route ที่มีอยู่แล้ว ไม่ต้องสร้างใหม่)

`useBreadcrumb` ใส่ label ตาม `name` (loading state ระหว่างโหลดเหมือน vendor detail)

## Part 4: การเชื่อมโยง Vendor ↔ User และ `UserStatusBadge`

**`components/user-status-badge.tsx`** (ใหม่ — เทียบเท่า `VendorStatusBadge` แต่คนละชุดสถานะ):
```ts
const STATUS_CONFIG: Record<UserStatus, { label: string; badge: string; dot: string }> = {
  pending:   { label: "รอตรวจสอบ", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  active:    { label: "ใช้งานอยู่", badge: "bg-green-100 text-green-800", dot: "bg-green-500" },
  suspended: { label: "ระงับการใช้งาน", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  inactive:  { label: "ปิดใช้งาน", badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};
```
โครง component เหมือน `VendorStatusBadge` ทุกอย่าง (`Badge` + จุดสี + label)

**Vendor detail page (`app/dashboard/vendors/detail/page.tsx`) — เพิ่มลิงก์เล็ก ๆ ไป User detail**

หา (บรรทัดที่แสดงอีเมลของ vendor):
```tsx
<p className="text-sm text-muted-foreground">{vendor.user?.email}</p>
```
เพิ่มลิงก์ต่อท้าย (แสดงเมื่อ `vendor.user?.id` มีค่า — จะมีเสมอถ้า backend เพิ่ม `id` ตาม Part API contract ข้อ 3 แล้ว):
```tsx
<p className="text-sm text-muted-foreground">
  {vendor.user?.email}
  {vendor.user?.id && (
    <Link href={routes.dashboards.user.detail(vendor.user.id)} className="ml-2 text-red-700 hover:underline">
      ดูบัญชีผู้ใช้
    </Link>
  )}
</p>
```
ต้องเพิ่ม `id?: number` เข้าไปใน `VendorProfile["user"]` type ที่ `lib/vendor/profile/types.ts` ด้วย (ตาม backend contract ข้อ 3)

**เพิ่ม `routes.dashboards.user.detail` ใน `lib/routes.ts`:**
```ts
user: {
  index: "/dashboard/users",
  detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
},
```
(รูปแบบเดียวกับ `routes.dashboards.vendors.detail`) พร้อมลบ `import { Users } from "lucide-react"` ที่ไม่ได้ใช้ออกจากไฟล์นี้ (dead code จาก WIP เดิม)

## Error handling / Loading

เหมือน Vendor list ทุกอย่าง:
- โหลดครั้งแรก (`isPending`) → skeleton เต็มหน้า
- เปลี่ยน filter/หน้า (`isFetching`, มี data เดิม) → skeleton เฉพาะตาราง (`keepPreviousData`)
- โหลดพลาด (list) → "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง"
- โหลดพลาด (detail) → ข้อความ "ไม่พบข้อมูลผู้ใช้รายนี้" (เหมือน vendor detail's `notFound` state)
- ไม่พบผลลัพธ์ในตาราง → ข้อความต่างกันตามกรณี (ค้นหาไม่เจอ / ไม่มี user ในระบบเลย / filter ไม่มีผลลัพธ์)

## Testing

ไม่มี test runner ในโปรเจกต์นี้ ([per memory](project_no_browser_automation.md)) — ตรวจด้วย `tsc`/lint/build แล้ว disclose manual QA:
1. เข้าหน้า `/dashboard/users` เป็น internal staff → เห็นตาราง user ทุกประเภท, filter ประเภท/สถานะทำงานถูกต้อง, ค้นหาทำงานถูกต้อง
2. คลิกปุ่มดูรายละเอียดแถว internal user → เห็นข้อมูล ไม่มีปุ่ม "ดูข้อมูลผู้ค้า"
3. คลิกปุ่มดูรายละเอียดแถว company/individual user → เห็นปุ่ม "ดูข้อมูลผู้ค้า" กดแล้วไปหน้า Vendor detail ที่ถูกต้อง (id ตรงกับ vendor นั้นจริง ไม่ใช่ user id)
4. จากหน้า Vendor detail (ที่มีอยู่แล้ว) → เห็นลิงก์ "ดูบัญชีผู้ใช้" ข้างอีเมล กดแล้วไปหน้า User detail ของ user คนนั้นถูกต้อง
5. ทดสอบ error state ทั้ง list และ detail (mock/บล็อก request ชั่วคราว)
6. เช็คทั้ง light/dark mode
