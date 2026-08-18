# Role/Permission CRUD completion (backend)

Date: 2026-08-18
Status: Approved

## บริบท

`docs/superpowers/specs/2026-08-14-role-permission-management-design.md` (root-level, frontend-authored) และ `docs/superpowers/specs/2026-08-15-permission-management-design.md` (ต่อยอด, เปิด CRUD permission เต็มรูปแบบ) คือ single source of truth ของ API contract — frontend ทำ UI เสร็จสมบูรณ์แล้วทั้งหมดที่ `frontend/app/dashboard/users/roles-permissions/` (2 tab: Role / Permission) รอ backend endpoint ที่ยังไม่มีอยู่จริงเท่านั้น

**ยืนยันจากโค้ดจริงว่าทำไปแล้วแค่บางส่วน** (`routes/api/v1/dashboard/users.php`, `RoleController.php`, `PermissionController.php` ปัจจุบัน):
- `GET /permissions` — มีแล้ว (query จากตาราง Spatie จริง พร้อม `label`, `group` derive จาก `explode('.', $name)[0]`)
- `GET /roles` — มีแล้ว (คืน `id`/`name`/`permissions`/`userCount`)
- `POST /roles` — มีแล้ว (`CreateRoleUseCase`, `StoreRoleRequest`)
- `PATCH /roles/{id}`, `DELETE /roles/{id}` — **ยังไม่มี** ← สเปคนี้ทำ
- `POST /permissions`, `PATCH /permissions/{name}`, `DELETE /permissions/{name}` — **ยังไม่มี** ← สเปคนี้ทำ

**สำคัญ — permission `roles.manage` ถูกถอดออกจากระบบทั้งหมดแล้ว** (`docs/superpowers/specs/2026-08-15-permission-management-design.md` หัวข้อ B, implement แล้วที่ commit `49d57c2`, ดู `.superpowers/sdd/progress.md`): การเข้าถึงหน้า/endpoint กลุ่มนี้ทั้งหมดเช็คด้วย Spatie **role** ชื่อ `admin` ตรงๆ ผ่าน middleware `role:admin` (ไม่ใช่ `can:roles.manage` อีกต่อไป) — เอกสาร `2026-08-15-permission-management-design.md` บรรทัด 33 ที่ยังเขียนว่า "gate ด้วย `can:roles.manage`" เป็นข้อความค้าง (เขียนไว้ก่อนหัวข้อ B จะ implement เสร็จ) สเปคนี้ยึดโค้ดจริง (`role:admin`) เป็นหลัก ไม่ใช่ข้อความนั้น

## Module placement

อยู่ใน `App\Modules\User` module เดิม ต่อยอด `RoleController`/`PermissionController` ที่มีอยู่แล้ว ใช้ Eloquent model ของ `spatie/laravel-permission` ตรงๆ เหมือนเดิม ไม่มี Domain Entity/Repository wrapper เพิ่ม

## Authorization

ทั้ง 5 route ใหม่ gate ด้วย `role:admin` — ตรงกับ `POST /roles` และ `GET /permissions` ที่มีอยู่แล้วเป๊ะ (ไม่ใช้ `can:roles.manage` เพราะ permission นั้นถูกลบออกจากระบบแล้ว)

## Permission validation

`StoreRoleRequest`/`UpdateRoleRequest`'s `permissions.*` validate ผ่าน `Rule::exists('permissions', 'name')` (query ตารางจริง — ของเดิมใช้แบบนี้อยู่แล้วใน `StoreRoleRequest ปัจจุบัน, ไม่ใช่ enum เพราะ enum ถูกลบไปแล้วตาม 2026-08-15-permission-management-design.md หัวข้อ A)

## Safeguards

**1. ลบ role ที่มี user ใช้งานอยู่ไม่ได้** (สืบทอดจาก `2026-08-14-role-permission-management-design.md` Safeguard 1, ไม่เกี่ยวกับการถอด `roles.manage` จึงยัง valid) — `DeleteRoleUseCase` throw `RoleInUseException extends DomainException` (มี `render(): JsonResponse` คืน `422 {"message": "ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้"}`, Laravel auto-detect ไม่ต้องลงทะเบียนใน `bootstrap/app.php`)

**2. ป้องกัน role `admin` ถูก rename/delete โดยไม่ตั้งใจ — เพิ่มใหม่ในสเปคนี้ (ยืนยันจาก user ในเซสชันนี้ผ่าน AskUserQuestion)**

ข้อนี้**เขียนทับ**ข้อความเดิมใน `2026-08-14-role-permission-management-design.md` บรรทัด 16/91 ("role admin ลบได้ถ้าไม่มี user ใช้งานแล้ว ไม่ทำ hard-protect เพิ่มเติม") — เหตุผลที่กลับคำ: ข้อความเดิมเขียนไว้ตอนที่การเข้าถึงทั้งฟีเจอร์นี้ยังผูกกับ **permission** `roles.manage` (แก้ไข/มอบใหม่ให้ role ไหนก็ได้ทาง DB ถ้าพลาด) แต่ตอนนี้ (หลัง commit `49d57c2`) การเข้าถึงผูกกับ **role ชื่อ `admin` ตรงๆ** เป็นกลไกเดียวในระบบ — ถ้า role แถวนี้ถูกลบหรือเปลี่ยนชื่อไปจริง จะไม่มีใครผ่าน `role:admin` gate ได้อีกเลย รวมถึง route จัดการ role/permission เหล่านี้เองด้วย ต้องแก้ผ่าน `php artisan tinker`/DB ตรงๆ เท่านั้น — ความเสี่ยงสูงกว่าตอนเขียนสเปคเดิมมาก จึงเพิ่ม hard-protect

Implementation: เช็คใน `UpdateRoleUseCase`/`DeleteRoleUseCase` ตรงๆ (ไม่ใช้ `FormRequest::after()` แบบสเปคเดิมที่เคยออกแบบไว้ เพราะ `DELETE` ไม่มี body ให้ validate, ใช้กลไกเดียวกันทั้ง update/delete ให้สม่ำเสมอกว่า) — throw `AdminRoleProtectedException extends DomainException` (`render()` แบบเดียวกับ `RoleInUseException`, คืน `422`):
- `UpdateRoleUseCase`: โหลด role เดิมจาก DB ก่อนแก้ ถ้า **ชื่อเดิม** (ไม่ใช่ชื่อใหม่ใน payload) `=== 'admin'` และ payload's `name !== 'admin'` → throw ข้อความ `"ไม่สามารถเปลี่ยนชื่อ role admin ได้"` (เปลี่ยน permission ของ role admin ยังทำได้ปกติ ไม่ block — เฉพาะการเปลี่ยน**ชื่อ**เท่านั้น)
- `DeleteRoleUseCase`: ถ้าชื่อ role `=== 'admin'` → throw ข้อความ `"ไม่สามารถลบ role admin ได้"` (เช็คนี้มาก่อนเช็ค `userCount > 0` เพราะเป็นเงื่อนไขที่เด็ดขาดกว่า ไม่ขึ้นกับจำนวน user)

Frontend ไม่ต้องแก้อะไร: `use-role-form.ts`/`delete-role-dialog.tsx`'s `getErrorMessage` อ่าน `.message` เป็น fallback อยู่แล้วสำหรับ error ที่ไม่มี field-level `.errors` (DomainException's `render()` คืนแค่ `{message}` ไม่มี `errors` key — เข้าทาง fallback นี้พอดี)

**3. Permission delete/update — ไม่มี safeguard** (สืบทอดจาก `2026-08-15-permission-management-design.md`'s "ความเสี่ยงที่ยอมรับแล้ว" ตรงๆ ไม่เปลี่ยน) — ลบ permission ที่ผูกกับ role ใดๆ อยู่ dependent แถว `role_has_permissions`/`model_has_permissions` cascade ลบอัตโนมัติผ่าน FK `cascadeOnDelete()` (ยืนยันแล้วจาก `database/migrations/2026_07_06_041833_create_permission_tables.php`) ไม่ต้องเขียนโค้ด detach เอง Spatie's `RefreshesPermissionCache` trait (ที่ `Permission`/`Role` model ใช้อยู่แล้ว) เคลียร์ cache ให้อัตโนมัติทุกครั้งที่ save/delete ไม่ต้องเรียก `forgetCachedPermissions()` เอง

**เพิ่มเติม (พบระหว่าง whole-plan review, ยืนยันจาก user ผ่าน AskUserQuestion หลังรับทราบข้อเท็จจริงนี้):** ความเสี่ยงของข้อ 3 กว้างกว่าที่เอกสารต้นทางพูดถึง — ไม่ใช่แค่ pivot cascade (`role_has_permissions`) แต่ permission บางตัวยังถูกอ้างเป็น string literal ตรงๆ ใน `can:` middleware/policy ที่อื่นในแอปโดยไม่มี `Gate::define()` fallback รองรับ เช่น `can:users.update` คุม 3 route ใน `routes/api/v1/dashboard/users.php` (revoke/revokeAll session), `VendorProfilePolicy::viewAny()`/`review()` เช็ค `$user->can('vendors.view')`/`can('vendors.review')` ตรงๆ คุม vendor-approval routes ทั้งหมด — ลบหรือเปลี่ยนชื่อ permission เหล่านี้ผ่าน UI นี้ทำให้ route ที่พึ่งมัน deny ทุกคนทันที ไม่ใช่แค่หลุดจาก role เดียว ผู้ใช้ยืนยันรับความเสี่ยงนี้ต่อหลังรู้ข้อเท็จจริงนี้แล้ว (เหตุผลเดิมยังคงอยู่: ต้องการความยืดหยุ่นเต็มที่ ไม่แยก system/custom permission) — ไม่เพิ่ม safeguard ใดๆ บันทึกไว้เป็น docblock บน `DeletePermissionUseCase::execute()`/`UpdatePermissionUseCase::execute()`

## File list

```
app/Modules/User/
  Domain/
    Exceptions/
      RoleInUseException.php               [new]
      AdminRoleProtectedException.php      [new]
  Application/
    DTOs/
      PermissionData.php                   [new]
    UseCases/
      UpdateRoleUseCase.php                [new]
      DeleteRoleUseCase.php                [new]
      CreatePermissionUseCase.php          [new]
      UpdatePermissionUseCase.php          [new]
      DeletePermissionUseCase.php          [new]
  Presentation/
    Http/
      Requests/
        UpdateRoleRequest.php              [new]
        StorePermissionRequest.php         [new]
        UpdatePermissionRequest.php        [new]
      Resources/
        PermissionResource.php             [new]
      Controllers/
        RoleController.php                 [modify: + update()/destroy()]
        PermissionController.php           [modify: + store()/update()/destroy()]
routes/api/v1/dashboard/users.php          [modify: + 5 routes]
```

## Response shape notes

`PermissionData` DTO (คู่กับ `RoleData` ที่มีอยู่แล้ว): `readonly string $name, readonly string $label` — ใช้ทั้ง `CreatePermissionUseCase`/`UpdatePermissionUseCase` เหมือนที่ `RoleData` ใช้ร่วมกันทั้ง create/update role

`RoleResource` (มีอยู่แล้ว) ใช้ซ้ำกับ `update()` เหมือน `store()` — ไม่มีการเปลี่ยน shape

`PermissionResource` ใหม่ (คู่กับ `ListPermissionsQuery`'s array shape เดิม): `{name, label, group}` โดย `group` derive จาก `explode('.', $this->name)[0]` แบบเดียวกับ `ListPermissionsQuery` (คัดลอก logic เดียวกัน ไม่แชร์ helper ข้าม layer เพราะ query กับ resource เป็นคนละ concern ในโค้ดเดิมอยู่แล้ว)

## Routes

```
PATCH  /api/v1/dashboard/roles/{id}         role:admin   dashboard.roles.update
DELETE /api/v1/dashboard/roles/{id}         role:admin   dashboard.roles.destroy
POST   /api/v1/dashboard/permissions        role:admin   dashboard.permissions.store
PATCH  /api/v1/dashboard/permissions/{name} role:admin   dashboard.permissions.update
DELETE /api/v1/dashboard/permissions/{name} role:admin   dashboard.permissions.destroy
```

`{name}` ไม่ constraint ด้วย `whereAlphaNumeric`/`whereNumber` (permission name มีจุด/underscore) — รับเป็น string ตรงๆ, lookup ด้วย `Permission::where('name', $name)->firstOrFail()` ใน UseCase (ไม่ใช้ implicit route-model-binding เพื่อให้สม่ำเสมอกับ `Role::findOrFail($id)` ที่ `UpdateRoleUseCase`/`DeleteRoleUseCase` ใช้อยู่แล้ว)

## Validation rules (ตรงตาม root-level contract เป๊ะ)

- **`UpdateRoleRequest`**: เหมือน `StoreRoleRequest` ทุกอย่าง (`name` regex `^[a-z][a-z0-9_]*$`, unique ignore self ด้วย `Rule::unique('roles','name')->ignore($this->route('id'))`; `permissions.*` ผ่าน `Rule::exists('permissions','name')`)
- **`StorePermissionRequest`**: `name` required, unique, regex `^[a-z][a-z0-9_]*\.[a-z][a-zA-Z0-9_]*$`; `label` required string
- **`UpdatePermissionRequest`**: เหมือน Store ทุกอย่าง, unique ignore self ด้วย `Rule::unique('permissions','name')->ignore($this->route('name'), 'name')`

## Testing

Pest feature test ตาม pattern เดิมของ `CreateRoleUseCaseTest`/`StoreRoleTest` — ต่อ endpoint ใหม่แต่ละตัวมี: UseCase test (happy path + safeguard case) + HTTP test (401 ไม่ auth, 403 ไม่ใช่ role admin, happy path, validation error, safeguard error) รวม `AdminRoleProtectedException` ทั้ง 2 เคส (rename admin ไม่ได้, delete admin ไม่ได้) และ `RoleInUseException` เคสเดิม
