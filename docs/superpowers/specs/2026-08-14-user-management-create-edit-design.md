# User management: เพิ่ม/แก้ไข internal user + เปลี่ยนสถานะ user ทุกประเภท (frontend only)

Date: 2026-08-14
Status: Draft — รอ backend ทำ API ตาม contract ด้านล่าง (แยกเป็นอีก plan)

## บริบท / ขอบเขตใหญ่

ต่อยอดจาก `docs/superpowers/specs/2026-08-13-user-management-list-design.md` ซึ่งทำแค่ "ดูรายชื่อ + รายละเอียด" (read-only) และเว้น 3 ความสามารถไว้เป็น sub-project แยก: เปลี่ยนสถานะ user, สร้าง internal user ใหม่, จัดการ role ของ internal staff — spec นี้ทำทั้ง 3 อย่างรวมกัน (ตกลงกับ user แล้วว่าไม่ต้องแยกเพราะเกี่ยวเนื่องกันบนหน้าเดิม)

**ฝั่ง backend ยังไม่มี API สำหรับสิ่งเหล่านี้เลยแม้แต่ endpoint เดียว** มีแค่:
- `CreateInternalUserUseCase` (ใช้แค่ตอน seed ข้อมูล ไม่ได้ผูก route/API)
- `UserStatus` state machine (`app/Modules/User/Domain/States/UserStatus.php`) ที่นิยาม transition ที่ถูกต้องไว้แล้ว แต่ไม่มีโค้ดที่เรียกใช้เลยนอกจาก `activate()` ใน `CreateInternalUserUseCase`

ตกลงแบบเดียวกับ spec หน้ารายชื่อเดิม: **ออกแบบ UI/UX ก่อน แล้ว derive API contract ให้ backend ทำตามเป็นอีก plan** (session นี้เป็น frontend เท่านั้น)

## ขอบเขตของ spec นี้ (ยืนยันกับ user แล้ว)

- **เพิ่ม user**: สร้าง **internal user (พนักงานภายใน) เท่านั้น** — company/individual ยังคงมาจากการสมัคร vendor เองเท่านั้น ไม่มีปุ่มสร้างจากหน้านี้
- **แก้ไขข้อมูลโปรไฟล์ + role**: **internal staff เท่านั้น** — company/individual ไม่มีปุ่มแก้ไขจากหน้านี้ (ข้อมูล vendor แก้ที่ฝั่ง Vendor module อยู่แล้ว)
- **เปลี่ยนสถานะ**: ใช้ได้กับ **user ทุกประเภท** (internal/company/individual) ผ่าน dropdown ในคอลัมน์สถานะของตารางรายชื่อ (`app/dashboard/users/page.tsx`) โดยตรง — ไม่ใช่หน้าแยก, ไม่ใช่ dialog
- **UI ทั้งหมดเป็น Dialog/Modal บนหน้าเดิม** (list + detail) ไม่มี route ใหม่
- **Permission-gated**: permission ใหม่ 3 ตัว (`users.create`, `users.update`, `users.updateStatus`) ควบคุมการมองเห็นปุ่ม/dropdown เหล่านี้
- **รหัสผ่านตอนสร้าง internal user ใหม่**: admin ตั้งเองในฟอร์มโดยตรง (ไม่มี generate/ส่ง reset-link)
- **Role**: ดึงจาก API แบบ dynamic (ปัจจุบันมีแค่ "admin" role เดียว แต่ไม่ hardcode ฝั่ง frontend)

## Out of scope

- สร้าง/แก้ไขบัญชี company/individual จากหน้านี้ (ยังคงเป็นเส้นทางสมัคร vendor เดิม + แก้ที่ Vendor module เดิม)
- การจัดการ role/permission เอง (สร้าง role ใหม่, กำหนดว่า role ไหนมี permission อะไร) — ยังใช้ seeder-based เหมือนเดิม ("admin" role เดียว) สิ่งที่ spec นี้ทำคือแค่ "เลือก role ที่มีอยู่แล้วให้ user" ไม่ใช่ "สร้าง/แก้ role"
- ลบ user
- Dropdown เปลี่ยนสถานะบนหน้า User detail — คงเป็น read-only badge เหมือนเดิม เปลี่ยนได้ที่ตารางรายชื่อเท่านั้น
- Backend implementation ของ API ด้านล่าง — spec/plan แยกต่างหาก
- Bulk actions (เปลี่ยนสถานะ/ลบหลายคนพร้อมกัน)

## API contract ที่ต้องการจาก backend (ให้ backend spec ทำตามนี้)

Auth เดิม (Sanctum cookie) + policy-based permission (แบบเดียวกับ `can:review` ของ Vendor module)

**1. `POST /api/v1/dashboard/users`** — สร้าง internal user (`can:users.create`)
```jsonc
// Request
{
  "username": "somchai",
  "email": "somchai@example.com",
  "password": "xxxxxxxx",
  "role": "admin",
  "prefix": "นาย",       // optional
  "firstname": "สมชาย",
  "lastname": "ใจดี",
  "employeeNo": "EMP001", // optional
  "department": "จัดซื้อ", // optional
  "position": "เจ้าหน้าที่", // optional
  "phone": "0812345678"   // optional
}
```
Response `201`: `{ "data": UserDetail }` (shape เดียวกับ `GET /users/{id}`)
Field ตรงกับ `CreateInternalUserData` ที่มีอยู่แล้วทุกตัว — ฝั่ง backend คาดว่าใช้ `CreateInternalUserUseCase` เดิมได้เกือบทั้งหมด แค่ผูก controller action + form request validation + policy ability ใหม่

**2. `PATCH /api/v1/dashboard/users/{id}`** — แก้ไขโปรไฟล์ + role (`can:users.update`)
```jsonc
// Request — backend ต้อง reject (422/403) ถ้า target user ไม่ใช่ userType=internal
{
  "role": "admin",
  "prefix": "นาย",
  "firstname": "สมชาย",
  "lastname": "ใจดี",
  "employeeNo": "EMP001",
  "department": "จัดซื้อ",
  "position": "เจ้าหน้าที่",
  "phone": "0812345678"
}
```
Response `200`: `{ "data": UserDetail }`
ไม่มี username/email/password ในนี้ — แก้ได้แค่ profile fields + role (ตรงกับ `InternalProfile::update()` ที่มีอยู่แล้ว + reassign role)

**3. `PATCH /api/v1/dashboard/users/{id}/status`** — เปลี่ยนสถานะ (`can:users.updateStatus`, ใช้ได้ทุกประเภท user)
```jsonc
// Request
{ "status": "active" } // pending | active | suspended | inactive
// Response 200
{ "data": { "status": "active" } }
```
ต้องบังคับตาม state machine ที่มีอยู่แล้วจริงใน `UserStatus.php`:
`pending→active`, `active→suspended`, `suspended→active`, `active→inactive`, `inactive→active` เท่านั้น — ส่ง transition ที่ไม่ได้อยู่ในรายการนี้ต้องได้ `422` กลับมา (spatie/laravel-model-states จะ throw `TransitionNotFound` เองถ้าเรียก `transitionTo()` ตรงๆ — backend แค่ต้อง catch แล้ว map เป็น 422)

**4. `GET /api/v1/dashboard/roles`** — รายชื่อ role สำหรับ dropdown (`can:users.viewAny`, endpoint ใหม่)
```jsonc
{ "data": [{ "name": "admin" }] }
```

**5. แก้ `UserDetailResource`** — เพิ่ม `role` และ `internalProfile` เข้า `UserDetail` contract เดิม
```jsonc
{
  "data": {
    "id": 1, "username": "somchai", "email": "somchai@example.com", "name": "สมชาย ใจดี",
    "userType": "internal", "status": "active", "createdAt": "2026-08-01T09:00:00Z",
    "vendorProfileId": null,
    "role": "admin", // string ถ้า userType=internal, null ถ้าไม่ใช่
    "internalProfile": { // object ถ้า userType=internal, null ถ้าไม่ใช่ — ใช้ pre-fill ฟอร์มแก้ไข (ข้อ 2)
      "prefix": "นาย",
      "firstname": "สมชาย",
      "lastname": "ใจดี",
      "employeeNo": "EMP001",
      "department": "จัดซื้อ",
      "position": "เจ้าหน้าที่",
      "phone": "0812345678"
    }
  }
}
```
(gap พบตอนเขียน implementation plan: `name` เดิมเป็น string รวมแล้ว ใช้ pre-fill ฟอร์มแก้ไขไม่ได้ ต้องมี field แยกด้วย)

**6. Permission ใหม่ 3 ตัว**: `users.create`, `users.update`, `users.updateStatus` — มอบให้ role "admin" ใน `AdminUserSeeder` (เหมือน `vendors.view`/`vendors.review` ที่มีอยู่แล้ว)

## Part 1: `lib/user/management/` (ต่อยอดของเดิม)

```
lib/user/management/
  types.ts       # + role ใน UserDetail, + Role, CreateUserPayload, UpdateUserPayload
  api.ts         # + createUser(), updateUser(id, data), updateUserStatus(id, status), fetchRoles()
  queries/useRoles.ts
  mutations/useCreateUser.ts     # invalidate ["users"]
  mutations/useUpdateUser.ts     # invalidate ["users"]
  mutations/useUpdateUserStatus.ts  # invalidate ["users"]
```
Mutation pattern เดียวกับ `lib/vendor/approval/mutations/useApproveVendor.ts` ทุกอย่าง (`useMutation` + `onSettled: invalidate`)

`types.ts` เพิ่มเติม:
```ts
export interface Role {
  name: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  prefix?: string;
  firstname: string;
  lastname: string;
  employeeNo?: string;
  department?: string;
  position?: string;
  phone?: string;
}

export type UpdateUserPayload = Omit<CreateUserPayload, "username" | "email" | "password">;

export interface InternalProfileFields {
  prefix: string | null;
  firstname: string;
  lastname: string;
  employeeNo: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
}

export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
  role: string | null;
  internalProfile: InternalProfileFields | null;
}
```

## Part 2: สร้าง internal user — `app/dashboard/users/_components/create-user-dialog.tsx`

ปุ่ม **"+ เพิ่ม user"** มุมขวาบนของ `app/dashboard/users/page.tsx` (ข้าง filter) แสดงเมื่อ `useHasPermission("users.create")` เท่านั้น (permission infra มีอยู่แล้วที่ `lib/auth/permissions.ts` แต่ยังไม่เคยถูกใช้จริง — นี่จะเป็นจุดแรก)

```
app/dashboard/users/_components/
  create-user-dialog.tsx
  user-form-fields.tsx        # shared fields ระหว่าง create/edit (prefix, firstname, lastname, employeeNo, department, position, phone, role)
  _hooks/use-create-user-form.ts
```

- Dialog + RHF + zod (`zodResolver`), pattern เดียวกับ `add-contact-dialog.tsx` เป๊ะ: field-level required check ฝั่ง frontend (username/email/password/firstname/lastname/role required, ที่เหลือ optional), ความยาว/format ละเอียด (เช่น password policy) พึ่ง `422` error จาก backend ผ่าน `getErrorMessage` pattern เดิม (`use-add-contact-form.ts`)
- `role` เป็น `Select` ดึง options จาก `useRoles()`, label แสดงผ่าน dictionary เล็กๆ ในหน้า (`ROLE_LABELS: Record<string, string> = { admin: "ผู้ดูแลระบบ" }`, fallback เป็นชื่อ role ดิบถ้าไม่รู้จัก — กัน role ใหม่ที่ backend เพิ่มมาโดยไม่มี label ไทย)
- Submit สำเร็จ → `toast.promise` ("กำลังสร้าง user..." / "สร้าง user สำเร็จ") → reset form + close dialog → list รีเฟรชอัตโนมัติจาก invalidate (ไม่ navigate ไปหน้า detail)

## Part 3: แก้ไขโปรไฟล์ + role — `app/dashboard/users/detail/_components/edit-user-dialog.tsx`

ปุ่มไอคอน **Pencil "แก้ไข"** ข้าง header ของ `app/dashboard/users/detail/page.tsx` แสดงเมื่อ `user.userType === "internal"` **และ** `useHasPermission("users.update")`

- Dialog เดียวกันแนวคิดกับ Part 2 แต่ตัด username/email/password ออก, reuse `user-form-fields.tsx` เดียวกัน
- Pre-fill จาก `useUserDetail` ที่มีอยู่แล้ว (`initialValues` เข้า hook เดียวกับตอนสร้าง — pattern เดียวกับ `edit-contact-dialog.tsx`)
- Submit สำเร็จ → `toast.promise` → close dialog → detail + list รีเฟรชจาก invalidate `["users"]`

## Part 4: เปลี่ยนสถานะ inline ในตาราง — `components/user-status-select.tsx`

`columns.tsx` ปัจจุบัน export เป็น array คงที่ (`export const columns: ColumnDef<UserListItem>[] = [...]`) ต้องแปลงเป็น factory function เพื่อรับ permission flag เข้าไป:
```tsx
export function createColumns(canUpdateStatus: boolean): ColumnDef<UserListItem>[] => [
  // ...คอลัมน์เดิมทั้งหมดไม่เปลี่ยน...
  {
    id: "status",
    cell: ({ row }) =>
      canUpdateStatus
        ? <UserStatusSelect user={row.original} />
        : <UserStatusBadge status={row.original.status} />,
  },
  // ...
]
```
เรียกจาก `app/dashboard/users/page.tsx`: `const columns = useMemo(() => createColumns(useHasPermission("users.updateStatus")), [...])` (หรือเรียก `useHasPermission` แยกแล้ว pass ผลลัพธ์เข้า `useMemo` deps — รายละเอียด hook ordering ตัดสินใจตอน implement)

`UserStatusSelect`:
- ใช้ `Select` component เดิม (แบบเดียวกับ filter select บนหน้า list) แต่ `SelectTrigger` สไตล์เป็น pill สีตาม `STATUS_CONFIG` เดียวกับที่ `UserStatusBadge` ใช้อยู่ (หน้าตาเหมือนเดิมตอนปิด กดแล้วเลือกได้)
- ตัวเลือกที่โชว์ = current status + transition ที่ถูกต้องเท่านั้น ตาม mapping ที่ mirror จาก backend state machine:
  ```ts
  const VALID_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
    pending: ["active"],
    active: ["suspended", "inactive"],
    suspended: ["active"],
    inactive: ["active"],
  };
  ```
- เลือกค่าใหม่ → เรียก `useUpdateUserStatus(id)` ทันที (ไม่มี dialog ยืนยัน) → `toast.promise` + invalidate `["users"]`
- ระหว่างรอ mutation: dropdown ของแถวนั้น disabled + spinner เล็กในตัว trigger (per-row pending state, track ด้วย `mutation.variables`/`isPending` ของ mutation instance ต่อแถวหรือเช็ค `id` ที่กำลัง mutate)
- ใช้กับ user ทุกประเภท (internal/company/individual)

## Error handling

- Create/Edit dialog: `422` → toast แสดง field error แรก (pattern `getErrorMessage` จาก `use-add-contact-form.ts`)
- Status select: transition ไม่ถูกต้อง (`422`) หรือไม่มีสิทธิ์ (`403`) → toast error, ค่า select กลับไปค่าเดิมอัตโนมัติ (เพราะ query invalidate ดึงค่าจริงจาก server กลับมาทับ)

## Testing

ไม่มี test runner ในโปรเจกต์นี้ (ตามธรรมเนียมเดิมของ repo) — ตรวจด้วย `tsc`/lint/build แล้ว disclose manual QA:
1. ผู้ใช้ที่มี `users.create` → เห็นปุ่ม "+ เพิ่ม user" → กรอกฟอร์มครบ → user ใหม่ปรากฏในตาราง, กดดูรายละเอียดข้อมูลถูกต้อง (รวม role)
2. ผู้ใช้ที่ไม่มี `users.create` → ไม่เห็นปุ่ม
3. ผู้ใช้ที่มี `users.update` → เปิด internal user detail → เห็นปุ่มแก้ไข → แก้ไขโปรไฟล์+role → บันทึกสำเร็จ, ข้อมูลอัปเดตทั้งหน้า detail และตาราง
4. เปิด company/individual user detail → ไม่เห็นปุ่มแก้ไข (แม้มี permission) เพราะไม่ใช่ internal
5. ผู้ใช้ที่มี `users.updateStatus` → ทดสอบเปลี่ยนสถานะแต่ละ user แต่ละประเภทผ่าน dropdown ในตาราง → ตัวเลือกที่โชว์ตรงกับ state machine (เช่น `pending` เห็นแค่ `active`), บันทึกสำเร็จ, badge/สีอัปเดตทันที
6. ผู้ใช้ที่ไม่มี `users.updateStatus` → เห็น badge แบบ read-only เหมือนเดิม ไม่มี dropdown
7. ทดสอบ error state ทั้ง 3 action (validation error, permission denied, invalid transition)
8. เช็คทั้ง light/dark mode
