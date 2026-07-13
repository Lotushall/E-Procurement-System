# GET /api/v1/auth/user (current user + roles/permissions)

Date: 2026-07-13
Status: Approved

## บริบท / ปัญหา

ตอนนี้ frontend login ผ่าน `POST /api/v1/auth/login` ได้ข้อมูล user พื้นฐาน (id, username, email,
userType) กลับมาตอน login สำเร็จ แต่ไม่มีทางให้ frontend เช็คว่า "ตอนนี้ login อยู่ไหม เป็นใคร มี
role/permission อะไรบ้าง" หลังจากนั้น (เช่น ตอน refresh หน้าเว็บ, หรือก่อน render เมนูที่ขึ้นกับสิทธิ์)

`User` model มี `HasRoles` trait (`spatie/laravel-permission`) ต่ออยู่แล้ว แต่ยังไม่มีโค้ดไหนใน
ระบบเรียก `getRoleNames()`/`getPermissionNames()` เลย — endpoint นี้เป็นจุดแรกที่ expose ข้อมูลนี้ออกมา

`UserController` (`app/Modules/User/Presentation/Http/Controllers/UserController.php`) เป็นแค่
resource controller scaffold เดิมจาก `nwidart/laravel-modules` (คืน Blade view เปล่าๆ) ไม่ได้ผูก route
และไม่เกี่ยวกับ API — ไม่ใช้ไฟล์นี้

## เป้าหมาย

1. เพิ่ม `GET /api/v1/auth/user` (middleware `auth:sanctum`) คืนข้อมูล user ที่ login อยู่ปัจจุบัน พร้อม
   `roles` และ `permissions` เป็น array ของชื่อ (string)
2. ไม่ login มา → 401 (พฤติกรรมเดิมของ `auth:sanctum`)

## Non-goals

- ไม่สร้าง role/permission seeder หรือ assign role ให้ user ใดๆ (ระบบยังไม่มี role assign อยู่เลย —
  endpoint นี้แค่ expose สิ่งที่มีอยู่ ถ้ายังไม่ assign ก็จะได้ `roles: []`, `permissions: []`)
- ไม่แตะ `UserController`/`routes/api/v1/user.php` ใดๆ (ยังไม่มีไฟล์ routes สำหรับ User module) —
  endpoint นี้อยู่ใน `AuthController`/`routes/api/v1/auth.php` ตามที่ตกลงกัน
- ไม่ทำ resource caching/optimization ใดๆ — `getRoleNames()`/`getPermissionNames()` query ตรงๆ ทุกครั้ง

## Design

### Route (`routes/api/v1/auth.php`)

```php
Route::get('user', [AuthController::class, 'user'])
    ->middleware('auth:sanctum')
    ->name('auth.user');
```

### `AuthController::user()`

ไม่มี UseCase แยก — เป็นการอ่านข้อมูลล้วนๆ ไม่มี business rule ต้องตรวจสอบ (ต่างจาก `login()` ที่มีกฎ
บล็อกหลายอย่าง) ใช้ `$request->user()` (Eloquent model ที่ `auth:sanctum` resolve ให้แล้วผ่าน session
guard) ตรงๆ แทนการไปผ่าน domain `User` entity เพราะ `getRoleNames()`/`getPermissionNames()` เป็น
ความสามารถของ Spatie `HasRoles` trait บน Eloquent model เท่านั้น — domain entity ไม่รู้จัก role/permission

```php
public function user(Request $request): JsonResponse
{
    $user = $request->user();

    return response()->json([
        'data' => [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'userType' => $user->user_type->value,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getPermissionNames(),
        ],
    ]);
}
```

`getRoleNames()`/`getPermissionNames()` คืนค่าเป็น `Illuminate\Support\Collection` ซึ่ง
`response()->json()` serialize เป็น JSON array ให้อัตโนมัติอยู่แล้ว — ไม่ต้อง `->toArray()` เอง

`getPermissionNames()` คืน**ทุก permission ที่ user มีสิทธิ์จริง** (ทั้งที่ assign ตรงตัวและที่ได้ผ่าน
role) ไม่ใช่แค่ permission ที่ assign ตรงๆ — เหมาะกับ use case "เช็คสิทธิ์ฝั่ง frontend"

### Testing

`tests/Feature/Modules/Auth/CurrentUserTest.php`:
- login แล้วเรียก `GET /api/v1/auth/user` → 200 พร้อมข้อมูล user ที่ถูกต้อง, `roles`/`permissions`
  เป็น array ว่างถ้ายังไม่ได้ assign
- user ที่มี role/permission assign แล้ว → เรียกแล้วเห็น role/permission นั้นในผลลัพธ์ (ใช้
  `Spatie\Permission\Models\Role`/`Permission` สร้าง role ทดสอบใน test)
- ไม่ login มา → 401
