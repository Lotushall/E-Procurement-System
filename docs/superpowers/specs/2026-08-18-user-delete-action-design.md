# Delete user action (user list)

Date: 2026-08-18
Status: Draft — spec ครอบคลุมทั้ง backend + frontend และพัฒนาทั้งสองฝั่งใน session นี้ (frontend session, แก้ backend directory ตรง ๆ เพราะทำงานใน branch `Internal` เดียวกัน ไม่มี worktree แยก)

## บริบท

หน้า `dashboard/users` (list) ตอนนี้มีปุ่ม view กับ edit ในคอลัมน์ Actions (`app/dashboard/users/_components/table/columns.tsx`) แต่ยังไม่มีทางลบ user เลย ระบบสถานะปัจจุบัน (`pending`/`active`/`suspended`/`inactive`) ใช้สำหรับ "ระงับการใช้งาน" ไม่ใช่การลบ — สองเรื่องนี้แยกกันตามที่ยืนยันแล้ว

## เป้าหมาย

เพิ่มปุ่มลบ user ในตาราง list พร้อม dialog ยืนยัน ลบแบบ **soft delete** (เก็บ record ไว้ ไม่โชว์ในรายการอีกต่อไป)

## สถาปัตยกรรม: Soft delete ผ่าน `deleted_at` (ตัดสินใจแล้ว)

พิจารณา 2 แนวทาง:
- **`deleted_at` column + Eloquent `SoftDeletes` (เลือกแบบนี้)**: เพิ่มคอลัมน์ใหม่แยกจาก `status` เดิม ใช้ global scope ของ Eloquent กรอง user ที่ถูกลบออกจาก query ปกติ (index, show, login lookup) โดยอัตโนมัติ ไม่ต้องแก้ query เดิมที่มีอยู่
- **เพิ่มค่า `deleted` ใน enum `status` เดิม (ไม่เลือก)**: ไม่ต้อง migration schema ใหม่ แต่ทำให้ "การลบ" กับ "การเปลี่ยนสถานะ" ปนกันใน dropdown เดียวกัน (`UserStatusSelect` ที่แก้ inline ในตารางอยู่แล้ว) เสี่ยงเลือกผิดโดยไม่ตั้งใจ และ concept ต่างกันชัดเจน (deleted ไม่ควรเปลี่ยนกลับได้ง่ายเหมือน status อื่น)

## ขอบเขต (Scope)

- ลบ user จากหน้า list เท่านั้น (ปุ่มในคอลัมน์ Actions)
- Soft delete: ตั้ง `deleted_at`, user หายจากทุก query ที่ไม่ได้ระบุ `withTrashed()` (list, show, login)
- ลบสำเร็จ → เพิกถอน (revoke) session ทั้งหมดของ user นั้นทันที (ใช้ `RevokeAllUserSessionsUseCase` เดิม)
- ป้องกันการลบบัญชีของตัวเอง (self-delete guard) — ทั้ง backend (422) และ frontend (disable ปุ่ม + tooltip)
- Permission ใหม่ `users.delete` แยกจาก `users.update`/`users.updateStatus` เดิม seed ให้ role `admin`

## Out of scope

- ป้องกัน "ลบ admin คนสุดท้าย" ในระบบ (ถือว่าเกินขอบเขต ถ้าต้องการเป็น follow-up)
- ปุ่ม restore / undo การลบ (ไม่มี UI สำหรับ `withTrashed` list ใน spec นี้)
- Hard delete / purge ข้อมูลถาวร
- แก้ auth-check code path อื่น ๆ นอกจากเพิ่ม permission ใหม่

## Backend

**1. Migration** — เพิ่ม `deleted_at` (nullable timestamp) ในตาราง `users`
`database/migrations/2026_08_18_HHMMSS_add_deleted_at_to_users_table.php` (ใช้ `$table->softDeletes()`)

**2. Model** — `app/Modules/User/Infrastructure/Models/User.php`: เพิ่ม `use Illuminate\Database\Eloquent\SoftDeletes;` เข้า trait list

**3. Repository** — `app/Modules/User/Domain/Repositories/UserRepositoryInterface.php` เพิ่ม `public function delete(int $id): void;`
Implementation ใน `UserRepository.php`: `UserModel::findOrFail($id)->delete();` (soft-delete เพราะ trait)

**4. Permission** — `database/seeders/AdminUserSeeder.php` เพิ่มใน `givePermissionTo([...])`:
```php
Permission::updateOrCreate(['name' => 'users.delete', 'guard_name' => 'web'], ['label' => 'ลบ user']),
```

**5. Route** — `routes/api/v1/dashboard/users.php`:
```php
Route::delete('users/{id}', [UserController::class, 'destroy'])
    ->middleware('can:users.delete')
    ->whereNumber('id')
    ->name('dashboard.users.destroy');
```

**6. Use case** — `app/Modules/User/Application/UseCases/DeleteUserUseCase.php` (mirror `DeleteRoleUseCase`: return `string|null` error message):
```php
final class DeleteUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    public function execute(int $id, int $actingUserId): ?string
    {
        if ($id === $actingUserId) {
            return 'ไม่สามารถลบบัญชีของตัวเองได้';
        }

        $this->users->delete($id); // findOrFail ภายใน -> 404 ถ้าไม่มี/ถูกลบไปแล้ว

        $this->revokeAllSessions->execute($id);

        app_log('User deleted', ['user_id' => $id], 'info', 'user');

        return null;
    }
}
```

**7. Controller** — `UserController` inject `DeleteUserUseCase`, เพิ่มเมธอด:
```php
public function destroy(int $id, Request $request): JsonResponse
{
    $message = $this->deleteUser->execute($id, $request->user()->id);

    if ($message !== null) {
        return response()->json(['message' => $message], 422);
    }

    return response()->json(null, 204);
}
```

**8. Tests**
- `tests/Feature/Modules/User/DeleteUserUseCaseTest.php` — ลบสำเร็จ (`deleted_at` ถูกตั้ง, session ถูกเพิกถอน), ลบตัวเองถูกบล็อก, ลบ user ที่ไม่มีอยู่ → exception/404
- `tests/Feature/Modules/User/DestroyUserTest.php` (HTTP, mirror `DestroyRoleTest.php`): unauthenticated → 401, ไม่มี permission `users.delete` → 403, มี permission ลบสำเร็จ → 204 + `assertSoftDeleted('users', [...])` + ไม่โผล่ใน `GET /dashboard/users` อีก, ลบตัวเอง → 422, ลบ user ที่ไม่มีอยู่ → 404

## Frontend

**1. API** — `lib/user/management/api.ts` เพิ่ม:
```ts
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/users/${id}`);
}
```

**2. Mutation hook** — `lib/user/management/mutations/useDeleteUser.ts` (mirror `useDeleteRole.ts`):
```ts
export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSettled: invalidate,
  });
}
```

**3. Dialog component** — `app/dashboard/users/_components/table/delete-user-dialog.tsx` (mirror `delete-role-dialog.tsx`):
- Trigger: ปุ่ม icon `Trash2` สไตล์เดียวกับปุ่ม view/edit ที่มีอยู่ (`size-8 px-1.5 pt-px rounded-md bg-white`) สี destructive
- `AlertDialog` ยืนยัน (`ต้องการลบผู้ใช้ "{username}" ใช่หรือไม่?`) → `toast.promise` เหมือน `DeleteRoleDialog`
- Disabled + `Tooltip` เมื่อ `user.id === currentUser.id` (เทียบผ่าน `useUser()`) ข้อความ "ไม่สามารถลบบัญชีของตัวเองได้"

**4. Columns wiring** — `columns.tsx`:
- `createColumns(canUpdateStatus, canUpdateUser, canDeleteUser)` เพิ่ม param ที่ 3
- Actions cell: ต่อจากปุ่มแก้ไข render `{canDeleteUser && <DeleteUserDialog user={row.original} />}`

**5. Page wiring** — `page.tsx`: เพิ่ม `const canDeleteUser = useHasPermission("users.delete");` ส่งเข้า `createColumns(...)` และ dependency array ของ `useMemo`

## Error handling

Backend: 422 พร้อม `message` เมื่อบล็อก self-delete (pattern เดียวกับ `RoleController::destroy`), 404 มาตรฐานจาก `findOrFail` เมื่อ user ไม่มีอยู่/ถูกลบไปแล้ว, 403 จาก `can:users.delete` middleware

Frontend: `getErrorMessage` แบบเดียวกับ `DeleteRoleDialog` (ดึง `message` จาก axios error response, fallback เป็นข้อความ default "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")

## Testing

**Backend**: รัน Pest suite ตามปกติ (`DeleteUserUseCaseTest.php`, `DestroyUserTest.php`) — ครอบคลุมตามรายการใน "Backend > 8. Tests" ด้านบน

**Frontend**: ไม่มี test runner ในโปรเจกต์นี้ (ตามธรรมเนียมเดิม) — ตรวจด้วย `tsc`/lint/build แล้ว disclose manual QA:
1. เข้าหน้า user list ด้วยบัญชี admin → เห็นปุ่มลบในทุกแถวยกเว้นแถวของตัวเอง
2. กดลบ user คนอื่น → ยืนยันใน dialog → toast สำเร็จ → user หายจากตาราง
3. แถวของบัญชีตัวเอง → ปุ่มลบ disabled + hover เห็น tooltip
4. เข้าหน้า user list ด้วยบัญชีที่ไม่มี permission `users.delete` → ไม่เห็นปุ่มลบเลย
5. เช็คทั้ง light/dark mode
