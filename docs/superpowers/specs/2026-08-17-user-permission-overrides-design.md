# Per-user permission overrides on create/edit user

Date: 2026-08-17
Status: Draft — spec ครอบคลุมทั้ง backend + frontend, แต่ plan/implementation ของ session นี้ (frontend) ทำเฉพาะฝั่ง frontend เท่านั้น ฝั่ง backend ให้ session backend ทำแยกตาม API contract ด้านล่าง

## บริบท

ต่อยอดจาก `docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md` (สร้าง/แก้ไข internal user ผ่าน dialog) ซึ่งภายหลังในเซสชันนี้ถูกย้ายจาก dialog ไปเป็นหน้าเต็ม (`/dashboard/users/create`, `/dashboard/users/edit?id=`) เพราะ role/permission ที่จะเพิ่มเข้ามาในสเปกนี้จะเยอะเกินกว่าจะใส่ใน modal ได้พอดี

ปัจจุบัน user คนหนึ่งมีได้แค่ 1 role (`role: string`) และ effective permission ของ user = permission ทั้งหมดของ role นั้น (ผ่าน Spatie `HasRoles`) ไม่มีทางกำหนด permission เฉพาะรายคนได้เลย

## เป้าหมายของ spec นี้

ให้แอดมินกำหนด permission ของ internal user แต่ละคนได้ละเอียดกว่าระดับ role:
- เลือก role ได้เหมือนเดิม → permission checklist จะติ๊กตาม default ของ role นั้นให้อัตโนมัติ
- แอดมิน**ติ๊กเพิ่ม**ได้ (ให้ permission ที่ role ไม่ได้ให้)
- แอดมิน**ถอดติ๊กได้**แม้เป็น permission ที่ role นั้นให้มาปกติ (deny เฉพาะ user คนนี้)
- ชุด permission ที่ติ๊กไว้จริง ณ ตอน save คือ permission ที่ user คนนั้นมีจริง — ไม่ใช่แค่ "permission ของ role" อีกต่อไป

## สถาปัตยกรรม: Flatten-at-save (ตัดสินใจแล้ว)

พิจารณา 2 แนวทาง:
- **Flatten-at-save (เลือกแบบนี้)**: ตอน save, backend คำนวณชุด permission สุดท้าย (ที่ frontend ส่งมาตรงๆ จาก checklist) แล้วเก็บเป็น Spatie direct permission บน user (`syncPermissions()`) — role ยังคง assign ไว้ตามเดิมเพื่อการแสดงผล/จัดกลุ่มเท่านั้น แต่**ไม่ใช้ role สำหรับคำนวณสิทธิ์การเข้าถึงจริงอีกต่อไป** เมื่อ user มีการ customize permission แล้ว auth-check เดิมทั้งระบบ (`can:`, `Gate`, frontend `hasPermission()`) **ไม่ต้องแก้อะไรเลย** เพราะ `hasPermissionTo()`/`can()` มองเห็นแค่ direct permission ที่ sync ไว้อยู่แล้ว
- **Dynamic deny (ไม่เลือก)**: เก็บ role assignment ไว้ใช้จริง + เพิ่มตาราง `denied_permissions` + override `hasPermissionTo()` ให้หักลบตอน check ทุกครั้ง — ถูกต้องกว่าระยะยาว (permission ของ role เปลี่ยนแล้ว user ที่ยังไม่ได้ customize จะได้รับผลอัตโนมัติ) แต่ต้องแตะ auth-check core ทั้งระบบ ซึ่งเคยมีบั๊ก `Gate::before` self-recursion ในโค้ดจุดนี้มาก่อนแล้ว (ดู `.superpowers/sdd/progress.md`, Task 1 ของ `2026-08-15-role-permission-management-api.md`) — เสี่ยงสูงกว่ามาก

**Trade-off ที่ยอมรับแล้ว**: เมื่อ user ถูก customize permission ไปแล้ว (ไม่ว่าจะติ๊กเพิ่มหรือถอดติ๊ก) การแก้ permission ของ role ในภายหลัง (ผ่าน `RoleFormDialog`) จะ**ไม่**ส่งผลกับ user คนนั้นย้อนหลังโดยอัตโนมัติ ต้องเข้าไปแก้/save user คนนั้นใหม่ถึงจะอัปเดต

## ขอบเขต (Scope)

- ใช้ได้กับ **internal user เท่านั้น** (เหมือน `role`/`internalProfile` เดิมที่เป็น internal-only) — company/individual ไม่มี role/permission concept นี้ ไม่แตะ
- ใช้ได้ทั้งหน้า **create** และ **edit**
- **เปลี่ยน role ใน dropdown → รีเซ็ต permission checklist เป็น default ของ role ใหม่ทันที** (ทับของเดิมที่เคย customize ไว้ — ยืนยันกับ user แล้วว่ายอมรับพฤติกรรมนี้)
- Permission picker UI ใช้ component เดียวกับที่ `RoleFormDialog` ใช้อยู่แล้ว (Lock icon header, group ด้วย label, per-group Select All/Clear All, checkbox แบบ boxed grid) — **แยกออกมาเป็น shared component** เพื่อใช้ร่วมกัน ไม่ copy โค้ดซ้ำ

## Out of scope

- Dynamic/live deny (ดูหัวข้อสถาปัตยกรรมด้านบน)
- แก้ auth-check code path ใดๆ ในระบบ (`Gate`, middleware, `hasPermission()` ฝั่ง frontend) — ใช้ของเดิมทั้งหมด
- การแก้ permission ของ role เอง (`RoleFormDialog` ทำหน้าที่นี้อยู่แล้ว แยกกันคนละเรื่อง)
- Bulk-edit permission หลาย user พร้อมกัน
- Company/individual user permission (ไม่มี concept นี้)
- Audit log ว่าใครแก้ permission ของ user คนไหนเมื่อไหร่ (ถ้าต้องการ เป็น spec แยก)

## API contract ที่ต้องการจาก backend

**1. `UserDetail` response เพิ่ม field `permissions`**
```jsonc
{
  "data": {
    "id": 1, "username": "somchai", /* ...fields เดิม... */,
    "role": "admin",
    "internalProfile": { /* เดิม */ },
    "permissions": ["vendors.view", "vendors.review", "users.update"] // ใหม่ — null ถ้า userType != internal
  }
}
```
คือ direct permission ปัจจุบันของ user (ผลลัพธ์ล่าสุดที่เคย flatten-at-save ไว้ หรือถ้ายังไม่เคย customize เลยตั้งแต่สร้าง = permission ของ role ตอนสร้าง)

**2. `POST /api/v1/dashboard/users`** (สร้าง internal user) เพิ่ม field `permissions`
```jsonc
// Request (เพิ่มจาก contract เดิมใน 2026-08-14-user-management-create-edit-design.md)
{
  "username": "somchai", "email": "somchai@example.com", "password": "xxxxxxxx",
  "role": "admin",
  "permissions": ["vendors.view", "users.update"], // ใหม่ — required, array (อาจว่างได้)
  "prefix": "นาย", "firstname": "สมชาย", "lastname": "ใจดี", /* ...fields เดิม... */
}
```
Validation: `permissions.*` ต้อง `Rule::exists('permissions', 'name')` (pattern เดียวกับ `StoreRoleRequest` ที่ตรวจ permission ของ role อยู่แล้ว) ไม่ต้องสัมพันธ์กับ role ที่เลือก (ตั้งใจให้ diverge จาก role ได้)

Backend action: หลังสร้าง user + `syncRoles([$role])` ตามเดิม เพิ่ม `$user->syncPermissions($permissions)`

**3. `PATCH /api/v1/dashboard/users/{id}`** (แก้ไข internal user, กรณี 2b ใน spec เดิม) เพิ่ม field `permissions` เหมือนข้อ 2, เป็น full-replacement (ส่งมาเสมอ, sync ทับของเดิมทั้งหมด ไม่ merge)

## Frontend: shared PermissionPicker component

ดึง permission-picker UI ที่อยู่ใน `role-form-dialog.tsx` ตอนนี้ (group heading + per-group Select All/Clear All + boxed checkbox grid) ออกมาเป็น component ใหม่ เช่น `components/permission-picker.tsx`:

```tsx
function PermissionPicker({
  permissions,   // Permission[] — full catalog จาก usePermissions()
  value,         // string[] — permission names ที่ติ๊กอยู่
  onChange,      // (next: string[]) => void
}: { ... })
```

- `RoleFormDialog` เปลี่ยนมาเรียก `<PermissionPicker permissions={permissions ?? []} value={value} onChange={onChange} />` แทนโค้ด inline เดิม (ไม่มีการเปลี่ยนพฤติกรรม แค่ extract)
- Create/Edit user page เพิ่ม `permissions` เข้า form schema (`z.array(z.string())`), render `<PermissionPicker>` ต่อจาก field เลือก Role

**Role change → reset permissions**: ที่ `onValueChange` ของ Role `Select` ในหน้า create/edit user, นอกจาก `field.onChange(newRole)` แล้ว ให้ set ค่า `permissions` field เป็น `roles.find(r => r.name === newRole)?.permissions ?? []` ทับของเดิมทันที

**ค่าเริ่มต้น**:
- หน้า create: `permissions: []` จนกว่าจะเลือก role (ตอนนั้นจะถูกเซ็ตเป็น default ของ role ผ่าน role-change handler ด้านบน)
- หน้า edit: `permissions: user.permissions ?? []` (จาก `UserDetail` ใหม่) — สะท้อนชุดจริงที่ user มีอยู่ตอนนี้ ซึ่งอาจต่างจาก default ของ role ปัจจุบันถ้าเคย customize ไว้ก่อนหน้า

## Error handling

เหมือน pattern เดิมของหน้านี้ทั้งหมด (`422` → toast field error แรกจาก `getErrorMessage`)

## Testing

ไม่มี test runner ในโปรเจกต์นี้ (ตามธรรมเนียมเดิม) — ตรวจด้วย `tsc`/lint/build แล้ว disclose manual QA:
1. สร้าง user ใหม่ → เลือก role → checklist ติ๊กตาม default ของ role นั้น
2. ติ๊กเพิ่ม permission ที่ role ไม่มี → save → เปิดดู detail/edit ใหม่ → permission ที่เพิ่มยังติดอยู่
3. ถอดติ๊ก permission ที่ role มีอยู่ปกติ → save → user คนนั้นเข้าถึง feature ที่ permission นั้นคุมไม่ได้จริง (ทดสอบผ่าน login ด้วย user ทดสอบ หรือเช็คผลลัพธ์ `hasPermission()`)
4. แก้ไข user ที่เคย customize permission ไว้ → เปิดหน้า edit → checklist แสดงชุดที่ customize ไว้ (ไม่ใช่ default ของ role)
5. แก้ไข user คนเดิม → เปลี่ยน role ใน dropdown → checklist รีเซ็ตเป็น default ของ role ใหม่ทันที (ของเดิมที่เคย customize หายไป) → save → ยืนยันว่า user ได้ชุดใหม่ตาม role จริง
6. `RoleFormDialog` (สร้าง/แก้ไข role) ยังทำงานถูกต้องเหมือนเดิมหลัง extract `PermissionPicker` (regression check)
7. company/individual user ไม่มี permission picker แสดงในหน้า edit เลย
8. เช็คทั้ง light/dark mode
