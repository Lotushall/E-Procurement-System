# Permission management (frontend only) — extends role management

Date: 2026-08-15
Status: Draft — รอ backend ทำ API ตาม contract ด้านล่าง (แยกเป็นอีก plan)

## บริบท

ต่อยอดจาก `docs/superpowers/specs/2026-08-14-role-permission-management-design.md` ซึ่งเดิมกำหนด permission เป็นรายการคงที่จากโค้ด ห้ามสร้าง/แก้/ลบจาก UI — user ตัดสินใจกลับคำ ต้องการ CRUD permission เต็มรูปแบบจาก UI

**Amendment ต่อสเปคเดิม**: ยกเลิกข้อ "Out of scope: สร้าง permission ใหม่จาก UI" ใน `2026-08-14-role-permission-management-design.md` บรรทัด 20 — permission catalog ไม่ใช่ read-only อีกต่อไป

## ขอบเขตที่ตกลงกับ user

- **CRUD permission เต็มรูปแบบ**: สร้าง/แก้ไข/ลบ permission จาก UI ได้ รวมถึง permission เดิม 6 ตัวที่ผูกกับ `can:` gate จริงในโค้ด backend ด้วย
- **`group` derive อัตโนมัติจาก `name`**: ตัด prefix ก่อนจุดแรกใน `name` (เช่น `reports.export` → group `reports`) — ไม่ใช่ field ที่กรอกเอง ไม่เก็บเป็นคอลัมน์แยก คำนวณตอน serialize เสมอ เพื่อไม่ให้ `group` ค้างไม่ sync กับ `name` หลังแก้ไข
- **หน้าเดิมเปลี่ยนเป็น 2 tab**: route `/dashboard/users/roles` เปลี่ยนเป็น `/dashboard/users/roles-permissions`, breadcrumb/หัวข้อเปลี่ยนเป็น "จัดการ Role และสิทธิ์" — tab "Role" (ตารางเดิม) / tab "Permission" (ตารางใหม่)
- **ไม่มี safeguard กันแก้/ลบ permission ที่ผูกกับ `can:` gate จริง** — ผู้ใช้ยืนยันรับความเสี่ยงนี้แล้ว (ดู "ความเสี่ยงที่ยอมรับแล้ว" ด้านล่าง)

## ความเสี่ยงที่ยอมรับแล้ว (accepted risk)

Permission เดิม 6 ตัว (`vendors.view`, `vendors.review`, `users.create`, `users.update`, `users.updateStatus`, `roles.manage`) ผูกกับ `can:` gate จริงในโค้ด backend (route middleware / policy) — สเปคนี้ **ไม่กันการแก้ชื่อหรือลบ** permission เหล่านี้จาก UI แม้จะทำให้การเช็คสิทธิ์จริงในระบบพังทันที (เช่น ลบ `vendors.review` แล้วไม่มีใคร approve vendor ได้อีก, หรือลบ `roles.manage` ออกจากทุก role แล้วไม่มีใครเข้าหน้านี้ได้อีกจนกว่าจะ reseed) — user ยืนยันเลือกทางนี้เองหลังรับทราบความเสี่ยงแล้ว เหตุผลคือต้องการความยืดหยุ่นเต็มที่โดยไม่ต้องแยก "system" กับ "custom" permission

## Out of scope

- Multi-role ต่อ user (ระบบยังเป็น 1 user : 1 role เหมือนเดิม ไม่เปลี่ยน) — สืบทอดจากสเปคเดิม
- ดูรายชื่อ user ที่ใช้ role นี้ (โชว์แค่จำนวน ไม่ลิงก์ไปดูรายชื่อ) — สืบทอดจากสเปคเดิม
- Sidebar nav item ใหม่ — สืบทอดจากสเปคเดิม
- Backend implementation ของ API ด้านล่าง — spec/plan แยกต่างหาก
- Safeguard ป้องกันการลบ/แก้ permission ที่กำลังถูกใช้งานอยู่ใน role ใดๆ (ดู "ความเสี่ยงที่ยอมรับแล้ว")

## API contract ที่ต้องการจาก backend (ให้ backend spec ทำตามนี้)

Auth เดิม (Sanctum cookie) + policy-based permission ทั้งหมด gate ด้วย `can:roles.manage`

**1. แก้ `GET /api/v1/dashboard/permissions`** (ของเดิมจากสเปค 2026-08-14) — response ยังหน้าตาเดิม แต่ `group` ต้องคำนวณจาก `name` เสมอ (ไม่ใช่ hardcode คงที่อีกต่อไป เพราะตอนนี้ permission เพิ่ม/แก้ได้จาก UI):
```jsonc
{
  "data": [
    { "name": "vendors.view", "label": "ดูรายชื่อผู้ค้า", "group": "vendors" },
    { "name": "reports.export", "label": "ส่งออกรายงาน", "group": "reports" }
  ]
}
```
**หมายเหตุ**: `group` ในตัวอย่างสเปคเดิม (2026-08-14) เป็นภาษาไทย (`ผู้ค้า`, `ผู้ใช้`) เพราะตอนนั้น hardcode เอง — ตอนนี้เปลี่ยนมา derive จาก prefix ของ `name` แทน (ภาษาอังกฤษ, lowercase ตาม `name`) ดังนั้น permission เดิม 6 ตัวจะเห็น group เปลี่ยนจาก `ผู้ค้า`/`ผู้ใช้`/`Role/สิทธิ์` เป็น `vendors`/`users`/`roles` — เป็นผลข้างเคียงที่ยอมรับ (frontend จัดกลุ่มด้วย key นี้ตรงๆ ไม่ต้อง translate)

**2. `POST /api/v1/dashboard/permissions`** — สร้าง permission ใหม่ (`can:roles.manage`, endpoint ใหม่)
```jsonc
// Request
{ "name": "reports.export", "label": "ส่งออกรายงาน" }
// Response 201
{ "data": { "name": "reports.export", "label": "ส่งออกรายงาน", "group": "reports" } }
```
Validation: `name` required, unique, pattern `^[a-z][a-z0-9_]*\.[a-z][a-zA-Z0-9_]*$` (ต้องมีจุดคั่น prefix.action เพื่อให้ derive group ได้; prefix ต้องเป็นตัวพิมพ์เล็กล้วนเพราะใช้ derive group ที่ต้อง stable/predictable, ส่วน action อนุญาต camelCase ได้ เช่น `updateStatus`), `label` required string

**3. `PATCH /api/v1/dashboard/permissions/{name}`** — แก้ไข permission (`can:roles.manage`, endpoint ใหม่) — ใช้ `name` **เดิม (ก่อนแก้)** เป็น identifier ใน URL เพราะ `Permission` ที่ frontend เห็นไม่มี numeric id (อิง `name` เป็น unique key เหมือน resource เดิม)
```jsonc
// Request
{ "name": "reports.export_v2", "label": "ส่งออกรายงาน (v2)" }
// Response 200: { "data": Permission } (shape เดียวกับข้อ 2)
```
ไม่มี safeguard ใดๆ — แก้ `name` ของ permission ที่ผูกกับ role ใดๆ อยู่แล้ว ชื่อใหม่จะพาไปกับทุก role ที่มี permission นี้อยู่ (Spatie sync ผ่าน pivot table โดยอัตโนมัติ)

**4. `DELETE /api/v1/dashboard/permissions/{name}`** — ลบ permission (`can:roles.manage`, endpoint ใหม่)
ลบได้เสมอไม่มีเงื่อนไข — response สำเร็จ `204` ถ้า permission นี้ผูกอยู่กับ role ใดๆ จะหลุดออกจาก permission set ของ role นั้นโดยอัตโนมัติ (cascade ผ่าน pivot table)

## Part 1: `lib/user/management/` (ต่อยอดของเดิม)

```
lib/user/management/
  types.ts    # Permission ไม่เปลี่ยน shape; + PermissionFormPayload
  api.ts      # + createPermission(), updatePermission(name, data), deletePermission(name)
  mutations/useCreatePermission.ts   # invalidate ["users", "permissions"]
  mutations/useUpdatePermission.ts   # invalidate ["users", "permissions"]
  mutations/useDeletePermission.ts   # invalidate ["users", "permissions"] + ["users", "roles"] (permission ที่ลบอาจอยู่ใน role ที่ cache ไว้)
```

`types.ts` เพิ่มเติม:
```ts
export interface PermissionFormPayload {
  name: string;
  label: string;
}
```

## Part 2: เปลี่ยนหน้า role เดิมเป็น tab — ย้าย `app/dashboard/users/roles/` → `app/dashboard/users/roles-permissions/`

```
app/dashboard/users/roles-permissions/
  page.tsx                         # Tabs: "Role" | "Permission"
  _components/
    role-tab.tsx                   # เนื้อหาเดิมของ page.tsx (ตาราง role + dialogs)
    permission-tab.tsx             # ใหม่
    table/columns.tsx               # เดิม (role)
    table/permission-columns.tsx    # ใหม่
    role-form-dialog.tsx           # เดิม
    delete-role-dialog.tsx         # เดิม
    permission-form-dialog.tsx     # ใหม่ ใช้ร่วมกันสร้าง/แก้ไข (เหมือน pattern RoleFormDialog)
    delete-permission-dialog.tsx   # ใหม่
  _schemas/
    schema.ts                      # เดิม (RoleFormSchema)
    permission-schema.ts           # ใหม่
  _hooks/
    use-role-form.ts               # เดิม
    use-permission-form.ts         # ใหม่
```

ทั้งหน้ายัง gate ด้วย `useHasPermission("roles.manage")` เหมือนเดิม (ที่ระดับ `page.tsx`)

**`permission-tab.tsx`** — ตาราง (`ColumnDef<Permission>[]`) จัดกลุ่มด้วย `group` (heading + rows ในกลุ่มนั้น เหมือนโครง checklist ใน `role-form-dialog.tsx`) คอลัมน์: `name`, `label`, `group`, `actions` (แก้ไข/ลบ) + ปุ่ม "+ สร้าง permission" ด้านบนตาราง

**`permission-form-dialog.tsx`** — ไม่มี `permission` prop = โหมดสร้าง, มี = โหมดแก้ไข (pre-fill) — 2 input: `name`, `label` (ไม่มี input สำหรับ `group` — แสดง preview ข้อความ "จะถูกจัดกลุ่มเป็น: `<prefix>`" ใต้ input `name` อัปเดตแบบ real-time ตามที่พิมพ์)

**`permission-schema.ts`**:
```ts
export const PermissionFormSchema = z.object({
  name: z.string()
    .min(1, "กรุณากรอกชื่อ permission")
    .regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, "รูปแบบต้องเป็น prefix.action เช่น reports.export (ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น)"),
  label: z.string().min(1, "กรุณากรอก label"),
});
export type PermissionFormValues = z.infer<typeof PermissionFormSchema>;
```

**`delete-permission-dialog.tsx`** — `AlertDialog` ยืนยันธรรมดา ไม่มี `disabledReason`/safeguard ใดๆ (ต่างจาก `delete-role-dialog.tsx` ที่ block ตอน `userCount > 0`) — ข้อความยืนยัน: "ยืนยันลบ permission นี้? หากมี role ที่ใช้ permission นี้อยู่ จะถูกถอดออกจากทุก role โดยอัตโนมัติ"

## Part 3: เปลี่ยนชื่อ/ลิงก์เดิม

- `lib/routes.ts` — `roles: "/dashboard/users/roles"` → `roles: "/dashboard/users/roles-permissions"` (คง key เดิม ไม่กระทบจุดอื่นที่ import)
- `app/dashboard/users/page.tsx` — ปุ่ม "จัดการ role" เปลี่ยนข้อความเป็น "จัดการ Role และสิทธิ์" (ลิงก์เดิม อ้าง `routes.dashboards.user.roles` ที่ path เปลี่ยนแล้วอัตโนมัติ)

## Error handling / Loading

เหมือน Part role เดิม: skeleton ตอนโหลดครั้งแรก, `toast.promise` สำหรับ mutation, 422 field error ผ่าน `getErrorMessage` pattern เดิม

## Testing

ไม่มี test runner ในโปรเจกต์นี้ — ตรวจด้วย `tsc`/lint/build แล้ว disclose manual QA:
1. เข้า `/dashboard/users/roles-permissions` → เห็น tab "Role"/"Permission" สลับได้
2. Tab Permission → สร้าง permission ใหม่ (เช่น `reports.export` / "ส่งออกรายงาน") → เห็นในตาราง จัดกลุ่มเป็น `reports`
3. แก้ไข permission ที่สร้างไว้ → เปลี่ยน `label` → บันทึกสำเร็จ
4. แก้ไข `name` ของ permission ที่ผูกกับ role อยู่แล้ว → เช็คว่า role ที่มี permission นี้ยังอ้างชื่อใหม่ถูกต้อง (ไม่หลุดออกจาก role)
5. ลบ permission ที่ผูกกับ role อยู่ → เช็คว่า role นั้นสูญเสีย permission นี้ไปโดยไม่มี error
6. ลองแก้/ลบ permission เดิม 6 ตัว (เช่น `roles.manage`) → ควรทำได้ปกติไม่มี block (ยืนยันพฤติกรรม accepted-risk)
7. ผู้ใช้ที่ไม่มี `roles.manage` → เข้า `/dashboard/users/roles-permissions` ตรงๆ ไม่ได้เหมือนเดิม
8. เช็ค light/dark mode
