# Role/permission management API (backend)

Date: 2026-08-15
Status: Approved

## บริบท

Frontend ทำ UI เสร็จแล้วทั้งหมด (`frontend/docs/superpowers/plans/2026-08-14-role-permission-management.md`, merged) โดยอิงตาม API contract ที่ตกลงไว้ใน `docs/superpowers/specs/2026-08-14-role-permission-management-design.md` (root-level spec, single source of truth ของ contract — ดูไฟล์นั้นสำหรับ request/response shape ทุก endpoint แบบละเอียด รวม validation rules และ safeguard 2 ข้อ). Spec นี้พูดถึงแค่ "จะ implement ยังไงในโครง backend ที่มีอยู่" ไม่ทำซ้ำ contract

ยืนยันแล้วว่าไม่มี endpoint ไหนใน 5 ตัวนี้มีอยู่จริงในโค้ดปัจจุบัน (`routes/api/v1/dashboard/users.php` มีแค่ `GET users`/`GET users/{id}`) — ทำใหม่ทั้งหมด

**Out of scope**: `POST/PATCH users`, `PATCH users/{id}/status` — สเปกคนละใบ (`2026-08-14-user-management-create-edit-design.md`), ยังไม่ implement ในรอบนี้ `AdminUserSeeder`'s temporary grant สำหรับ permission เหล่านั้นคงไว้เหมือนเดิม

## Module placement

อยู่ใน `App\Modules\User\` module เดิม (ไม่แยกโมดูล Role ใหม่) เพราะ role/permission เป็น Spatie concept ที่ผูกกับ User โดยตรง และ `UserRepository::assignRole()` ก็อยู่ในโมดูลนี้อยู่แล้ว Role/Permission ใช้ Eloquent model ของ `spatie/laravel-permission` ตรงๆ (`Spatie\Permission\Models\Role`/`Permission`) ไม่มี Domain Entity/Repository interface ห่อเพิ่ม — เหมือนกับที่ `ListUsersQuery`/`GetUserByIdQuery` คุย Eloquent ตรงๆ ไม่ผ่าน repository เช่นกัน

## Permission catalog

`App\Modules\User\Domain\Enums\Permission` — backed string enum (6 cases ตรงตาราง catalog ใน spec หลัก) พร้อม `label(): string`, `group(): string`, `values(): array<string>` (ใช้ validate ว่า permission ที่ส่งมาต้องอยู่ใน catalog) นี่คือ "hardcode PHP enum" ที่ spec หลักขอ

## Authorization

Gate ใหม่ `roles.manage` (`Gate::define('roles.manage', [UserPolicy::class, 'manageRoles'])` ใน `UserServiceProvider::boot()`, เหมือน pattern `users.viewAny` เดิม) — `UserPolicy::manageRoles()` เช็ค `user_type === Internal && $user->can('roles.manage')` (Spatie permission check ผ่าน `HasRoles` trait)

Gate mapping ต่อ endpoint (ตรงตาม spec หลัก):
- `GET /permissions` → `can:roles.manage`
- `GET /roles` → `can:users.viewAny` (ของเดิม ไม่เปลี่ยน — ยังใช้เป็น dropdown source ที่ไม่ต้องมี `roles.manage`)
- `POST /roles`, `PATCH /roles/{id}`, `DELETE /roles/{id}` → `can:roles.manage`

## Safeguard implementation

**Safeguard 1 (admin ต้องมี `roles.manage` เสมอ)** — ใช้ `UpdateRoleRequest::after()` (ตาม `laravel-best-practices` skill: `after()` ไม่ใช่ `withValidator()` สำหรับ cross-field validation ที่พึ่ง DB) query role ปัจจุบันจาก route `{id}` เช็คชื่อ**เดิม**ก่อนแก้ (ไม่ใช่ชื่อใหม่ใน payload) แล้ว `$validator->errors()->add('permissions', '...')` ถ้าเป็น admin และ payload ไม่มี `roles.manage` — ได้ 422 มาตรฐานของ Laravel (`{message, errors: {permissions: [...]}}`) ตรงกับที่ frontend's `use-role-form.ts`'s `getErrorMessage` อ่าน `.errors` ก่อน `.message`

**Safeguard 2 (ลบ role ที่มี user ใช้งานไม่ได้)** — `DeleteRoleUseCase` throw `App\Modules\User\Domain\Exceptions\RoleInUseException` (extends `DomainException`, implements `render(): JsonResponse` คืน `422` + `{message}` — Laravel auto-detect exception ที่มี `render()` โดยไม่ต้องลงทะเบียนใน `bootstrap/app.php`) เลือกทางนี้แทน controller `try/catch(Throwable) -> 500` (pattern เดิมใน `VendorController`) เพราะ frontend's `delete-role-dialog.tsx`'s `getErrorMessage` อ่านแค่ `.message` ตรงๆ ไม่มี fallback อื่น ต้องได้ 422 กับข้อความที่ถูกต้องจริง ไม่ใช่ 500 ทั่วไป

## File list

```
app/Modules/User/
  Domain/
    Enums/Permission.php                          [new]
    Exceptions/RoleInUseException.php              [new]
  Application/
    DTOs/RoleData.php                              [new]
    Queries/ListPermissionsQuery.php                [new]
    Queries/ListRolesQuery.php                      [new]
    UseCases/CreateRoleUseCase.php                  [new]
    UseCases/UpdateRoleUseCase.php                  [new]
    UseCases/DeleteRoleUseCase.php                  [new]
  Presentation/
    Http/Controllers/PermissionController.php       [new]
    Http/Controllers/RoleController.php              [new]
    Http/Requests/StoreRoleRequest.php               [new]
    Http/Requests/UpdateRoleRequest.php              [new]
    Http/Resources/RoleResource.php                  [new]
    Policies/UserPolicy.php                          [modify: + manageRoles()]
  Providers/UserServiceProvider.php                 [modify: + Gate::define('roles.manage', ...)]
routes/api/v1/dashboard/users.php                   [modify: + 5 routes]
database/seeders/AdminUserSeeder.php                [modify: comment + keep roles.manage permanently]
```

## Response shape notes

`RoleResource`: `{id, name, permissions: string[], userCount}` — `permissions` มาจาก `$role->permissions->pluck('name')`, `userCount` มาจาก `withCount('users')` (`Role::users()` relation ที่ Spatie ให้มา — resolve เป็น `App\Modules\User\Infrastructure\Models\User` ผ่าน guard 'web', ใช้ morph map `'user'` ที่ลงทะเบียนไว้แล้วใน `AppServiceProvider`) หลัง create/update ต้อง `$role->load('permissions')->loadCount('users')` ก่อนคืนค่า เพราะ `syncPermissions()`/`save()` ไม่รีเฟรช relation ที่โหลดไว้ก่อนหน้าอัตโนมัติ

`ListPermissionsQuery`/`ListRolesQuery` เป็น Application-layer query เหมือน `ListUsersQuery` — ไม่มี HTTP concern เอาไปเทสได้อิสระจาก HTTP layer
