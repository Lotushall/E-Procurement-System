# Role/permission management (frontend only)

Date: 2026-08-14
Status: Draft — รอ backend ทำ API ตาม contract ด้านล่าง (แยกเป็นอีก plan)

## บริบท / ขอบเขตใหญ่

นี่คือ sub-project ที่ 4 ที่เว้นไว้ตั้งแต่ `docs/superpowers/specs/2026-08-13-user-management-list-design.md`: "จัดการ role/permission ของ internal staff — backend มีแค่ role `admin` เดียวตอนนี้ ต้องออกแบบ role/permission ใหม่ก่อน" ตอนนี้ทำ sub-project 2-3 (เปลี่ยนสถานะ, สร้าง/แก้ไข user) เสร็จแล้ว จึงมาทำข้อสุดท้าย

**ขอบเขตที่ตกลงกับ user**:
- **CRUD role เต็มรูปแบบ**: สร้าง/แก้ไข (รวมเปลี่ยนชื่อ)/ลบ role ได้ และกำหนดว่า role ไหนมี permission อะไรบ้าง
- **Permission เป็นรายการคงที่จากโค้ด** (ไม่ใช่พิมพ์เอง) —ตรงกับ `can:` gate ที่ผูกไว้จริงในระบบเท่านั้น
- **หน้าใหม่เป็น sub-route ของ Users**: `/dashboard/users/roles` (ไม่ใช่หน้าแยกระดับ sidebar, ไม่มี sidebar item ใหม่) เข้าถึงผ่านปุ่มบนหน้า `/dashboard/users`
- **Safeguard 2 ข้อ**:
  1. ลบ role ไม่ได้ถ้ายังมี user ใช้งานอยู่ (`userCount > 0`)
  2. ถอด permission `roles.manage` ออกจาก role **"admin"** ไม่ได้ (กันแอดมินล็อกตัวเองออกจากการจัดการ role) — แต่ role "admin" **ลบได้** ถ้าไม่มี user ใช้งานแล้ว (ไม่ทำ hard-protect เพิ่มเติมนอกเหนือจาก 2 ข้อนี้)

## Out of scope

- สร้าง permission ใหม่จาก UI (permission ผูกกับ `can:` gate ในโค้ดจริง เพิ่ม permission ใหม่ต้องแก้โค้ด/deploy)
- Multi-role ต่อ user (ระบบยังเป็น 1 user : 1 role เหมือนเดิม ไม่เปลี่ยน)
- ดูรายชื่อ user ที่ใช้ role นี้ (โชว์แค่จำนวน ไม่ลิงก์ไปดูรายชื่อ)
- Sidebar nav item ใหม่ (เข้าถึงผ่านปุ่มในหน้า Users เท่านั้น)
- Backend implementation ของ API ด้านล่าง — spec/plan แยกต่างหาก

## Permission catalog (fixed, ต้อง sync กับ `can:` gate จริงในโค้ด backend)

| name | label (ไทย) | group |
|---|---|---|
| `vendors.view` | ดูรายชื่อผู้ค้า | ผู้ค้า |
| `vendors.review` | อนุมัติ/ปฏิเสธผู้ค้า | ผู้ค้า |
| `users.create` | เพิ่ม user | ผู้ใช้ |
| `users.update` | แก้ไข user | ผู้ใช้ |
| `users.updateStatus` | เปลี่ยนสถานะ user | ผู้ใช้ |
| `roles.manage` | จัดการ role และสิทธิ์ | Role/สิทธิ์ |

(`roles.manage` เป็น permission ใหม่ที่ spec นี้เพิ่ม — ใช้ gate หน้า `/dashboard/users/roles` ทั้งหน้าและ endpoint CRUD role ทั้งหมดด้านล่าง)

## API contract ที่ต้องการจาก backend (ให้ backend spec ทำตามนี้)

Auth เดิม (Sanctum cookie) + policy-based permission

**1. `GET /api/v1/dashboard/permissions`** — permission catalog (`can:roles.manage`, endpoint ใหม่)
```jsonc
{
  "data": [
    { "name": "vendors.view", "label": "ดูรายชื่อผู้ค้า", "group": "ผู้ค้า" },
    { "name": "vendors.review", "label": "อนุมัติ/ปฏิเสธผู้ค้า", "group": "ผู้ค้า" },
    { "name": "users.create", "label": "เพิ่ม user", "group": "ผู้ใช้" },
    { "name": "users.update", "label": "แก้ไข user", "group": "ผู้ใช้" },
    { "name": "users.updateStatus", "label": "เปลี่ยนสถานะ user", "group": "ผู้ใช้" },
    { "name": "roles.manage", "label": "จัดการ role และสิทธิ์", "group": "Role/สิทธิ์" }
  ]
}
```
รายการนี้ hardcode ฝั่ง backend (เช่น PHP enum/const array) — ต้องตรงกับ `can:` gate ที่ผูกไว้จริงทุกตัว ไม่มีตัวไหน "ลอย"

**2. แก้ `GET /api/v1/dashboard/roles`** (ของเดิม, `can:users.viewAny` เหมือนเดิม — ไม่เปลี่ยน gate เพราะยังใช้เป็น dropdown ใน create/edit-user ที่ไม่ต้องมี `roles.manage`) — ขยาย response เพิ่ม `id`/`permissions`/`userCount`:
```jsonc
{
  "data": [
    {
      "id": 1,
      "name": "admin",
      "permissions": ["vendors.view", "vendors.review", "users.create", "users.update", "users.updateStatus", "roles.manage"],
      "userCount": 1
    }
  ]
}
```
Backward compatible กับ dropdown เดิมที่อ่านแค่ `.name` — ฟิลด์ใหม่แค่เพิ่มเข้ามา ไม่ลบของเดิม

**3. `POST /api/v1/dashboard/roles`** — สร้าง role (`can:roles.manage`, endpoint ใหม่)
```jsonc
// Request
{ "name": "procurement_officer", "permissions": ["vendors.view", "vendors.review"] }
// Response 201
{ "data": { "id": 2, "name": "procurement_officer", "permissions": ["vendors.view", "vendors.review"], "userCount": 0 } }
```
Validation: `name` required, unique, pattern `^[a-z][a-z0-9_]*$` (lowercase + underscore, ขึ้นต้นด้วยตัวอักษร — เพราะ role name ใช้เป็น identifier จริงในโค้ด ไม่ใช่แค่ label), `permissions` ทุกตัวต้องอยู่ใน catalog ข้อ 1 เท่านั้น (reject ถ้ามีตัวที่ไม่รู้จัก)

**4. `PATCH /api/v1/dashboard/roles/{id}`** — แก้ไข role: เปลี่ยนชื่อ + permission set (`can:roles.manage`, endpoint ใหม่)
```jsonc
// Request — full replacement ของ permissions (เหมือน pattern PATCH users/{id} เดิม)
{ "name": "procurement_officer", "permissions": ["vendors.view"] }
// Response 200: { "data": RoleDetail } (shape เดียวกับข้อ 2)
```
**Safeguard**: ถ้า role ที่กำลังแก้ (ดูจาก `id`, เช็คชื่อ**เดิม**ก่อนแก้ ไม่ใช่ชื่อใหม่ที่ส่งมา) คือ `"admin"` และ payload's `permissions` ไม่มี `"roles.manage"` → reject `422` พร้อมข้อความ "ไม่สามารถถอดสิทธิ์จัดการ role ออกจาก role admin ได้"
**ข้อจำกัดที่ยอมรับแล้ว**: การ protect นี้ผูกกับชื่อ `"admin"` ตรงๆ ถ้ามีคนเปลี่ยนชื่อ role admin เป็นชื่ออื่นสำเร็จ (ทำได้ เพราะไม่ได้ห้ามเปลี่ยนชื่อ) role นั้นจะไม่ถูก protect อีกต่อไปในการแก้ไขครั้งถัดไป — เป็นผลตามมาที่ยอมรับแล้วจากการเลือก safeguard แบบเรียบง่าย (ไม่ทำ hard-protect ผูกกับ id หรือกันเปลี่ยนชื่อ role นี้โดยเฉพาะ)

**5. `DELETE /api/v1/dashboard/roles/{id}`** — ลบ role (`can:roles.manage`, endpoint ใหม่)
Reject `422`/`409` ถ้า `userCount > 0` ("ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้") — response สำเร็จ `204`

**6. Permission ใหม่**: `roles.manage` — มอบให้ role "admin" ใน `AdminUserSeeder` (ต่อจาก 5 permission เดิม)

## Part 1: `lib/user/management/` (ต่อยอดของเดิม — ไม่แยกโมดูลใหม่ เพราะ role เป็นส่วนหนึ่งของการจัดการ user)

```
lib/user/management/
  types.ts    # + Permission, RoleDetail, CreateRolePayload, UpdateRolePayload; แก้ Role -> RoleDetail ใน useRoles()
  api.ts      # + fetchPermissions(), createRole(), updateRole(id, data), deleteRole(id)
  queries/usePermissions.ts
  mutations/useCreateRole.ts   # invalidate ["users", "roles"]
  mutations/useUpdateRole.ts   # invalidate ["users", "roles"]
  mutations/useDeleteRole.ts   # invalidate ["users", "roles"]
```

`types.ts` เพิ่มเติม:
```ts
export interface Permission {
  name: string;
  label: string;
  group: string;
}

export interface RoleDetail {
  id: number;
  name: string;
  permissions: string[];
  userCount: number;
}

export interface RoleFormPayload {
  name: string;
  permissions: string[];
}
```
`Role` (เดิม, แค่ `{name}`) เอาออก แทนที่ด้วย `RoleDetail` ทุกจุดที่ใช้ (รวม `useRoles()` — dropdown ใน create/edit-user dialog จะได้ field เพิ่มมาเฉยๆ ไม่กระทบ เพราะใช้แค่ `.name`)

## Part 2: หน้ารายชื่อ role — `app/dashboard/users/roles/page.tsx` (ใหม่)

```
app/dashboard/users/roles/
  page.tsx
  _components/
    table/columns.tsx
    role-form-dialog.tsx   # ใช้ร่วมกันทั้งสร้างและแก้ไข (field เหมือนกันเป๊ะ ต่างจาก user create/edit — ไม่มีปัญหา Control<T> เพราะ schema เดียวกัน)
    delete-role-dialog.tsx
  _schemas/schema.ts
  _hooks/use-role-form.ts
```

ทั้งหน้า gate ด้วย `useHasPermission("roles.manage")` ที่ระดับ `page.tsx` (ถ้าไม่มีสิทธิ์ → แสดงข้อความ "ไม่มีสิทธิ์เข้าถึงหน้านี้" หรือ redirect กลับ `/dashboard/users`)

**ตาราง** (`ColumnDef<RoleDetail>[]`): คอลัมน์ `name` (ชื่อ role), `permissions` (จำนวน permission เป็น badge เช่น "6 permissions"), `userCount` (จำนวน user เป็น badge), `actions` (ปุ่มแก้ไข + ปุ่มลบ)

**`RoleFormDialog({ role?: RoleDetail })`** — ไม่มี `role` prop = โหมดสร้าง, มี = โหมดแก้ไข (pre-fill) โครงเดียวกับ `AddContactDialog`/`EditContactDialog` ที่มีอยู่แล้ว (schema เดียวกันทั้ง 2 โหมดเพราะ field เหมือนกันเป๊ะ):
- Input `name` (แก้ได้ทั้ง 2 โหมด, `disabled` ไม่ต้องมี เพราะ user ยืนยันว่าเปลี่ยนชื่อได้)
- Checklist permission จัดกลุ่มตาม `group` จาก `usePermissions()` — ใช้ `Checkbox` component เดิม, group ละ heading + checkbox list

**`_schemas/schema.ts`**:
```ts
export const RoleFormSchema = z.object({
  name: z.string()
    .min(1, "กรุณากรอกชื่อ role")
    .regex(/^[a-z][a-z0-9_]*$/, "ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)"),
  permissions: z.array(z.string()).min(1, "กรุณาเลือกอย่างน้อย 1 permission"),
});
export type RoleFormValues = z.infer<typeof RoleFormSchema>;
```

**`delete-role-dialog.tsx`** — โครงเดียวกับ `DeleteContactDialog` ที่มีอยู่แล้วเป๊ะ: `AlertDialog` + `disabledReason` prop (โชว์ `Tooltip` ครอบปุ่มตอน disabled) — `disabledReason = userCount > 0 ? "ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ (N คน)" : undefined`

## Part 3: ปุ่มเข้าถึงจากหน้า Users เดิม

`app/dashboard/users/page.tsx` — เพิ่มปุ่ม "จัดการ role" (ลิงก์ไป `/dashboard/users/roles`) ข้างปุ่ม "+ เพิ่ม user" เดิม แสดงเมื่อ `useHasPermission("roles.manage")` เท่านั้น

**เพิ่ม `routes.dashboards.user.roles` ใน `lib/routes.ts`**: `roles: "/dashboard/users/roles"`

## Error handling / Loading

เหมือนหน้าอื่นๆ ในโปรเจกต์นี้ทั้งหมด: skeleton ตอนโหลดครั้งแรก, toast.promise สำหรับ mutation, 422 field error โชว์ผ่าน `getErrorMessage` pattern เดิม, ลบ role ที่มี user ใช้อยู่ป้องกันฝั่ง frontend ด้วย disabled+tooltip (ไม่ต้องพึ่ง backend error อย่างเดียว)

## Testing

ไม่มี test runner ในโปรเจกต์นี้ — ตรวจด้วย `tsc`/lint/build แล้ว disclose manual QA:
1. ผู้ใช้ที่มี `roles.manage` → เห็นปุ่ม "จัดการ role" บนหน้า Users → กดเข้าไปเห็นตาราง role
2. สร้าง role ใหม่ → เลือก permission บางส่วน → บันทึกสำเร็จ ปรากฏในตาราง
3. แก้ไข role ที่สร้างไว้ → เปลี่ยนชื่อ + เปลี่ยน permission → บันทึกสำเร็จ
4. ลองแก้ role "admin" ถอด `roles.manage` ออก → ควรถูก reject (ทดสอบ error state)
5. role ที่มี user ใช้งานอยู่ → ปุ่มลบ disabled + hover เห็น tooltip อธิบาย
6. role ที่ไม่มี user ใช้ → ลบได้ปกติ
7. ผู้ใช้ที่ไม่มี `roles.manage` → ไม่เห็นปุ่ม "จัดการ role" และเข้า URL `/dashboard/users/roles` ตรงๆ ไม่ได้ (แสดงข้อความไม่มีสิทธิ์)
8. เช็ค light/dark mode
