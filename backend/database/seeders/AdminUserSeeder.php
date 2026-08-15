<?php

namespace Database\Seeders;

use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Application\UseCases\CreateInternalUserUseCase;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the "admin" role, its vendor-approval permissions, and a default admin account.
     */
    public function run(): void
    {
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        $admin->givePermissionTo([
            Permission::updateOrCreate(['name' => 'vendors.view', 'guard_name' => 'web'], ['label' => 'ดูรายชื่อผู้ค้า']),
            Permission::updateOrCreate(['name' => 'vendors.review', 'guard_name' => 'web'], ['label' => 'อนุมัติ/ปฏิเสธผู้ค้า']),
            // Temporary: the users.create/update/updateStatus API endpoints don't exist yet
            // (see docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md) —
            // granted early so the already-shipped frontend UI is visible for local QA. The
            // real backend plan for that spec should revisit this grant once the endpoints ship.
            Permission::updateOrCreate(['name' => 'users.create', 'guard_name' => 'web'], ['label' => 'เพิ่ม user']),
            Permission::updateOrCreate(['name' => 'users.update', 'guard_name' => 'web'], ['label' => 'แก้ไข user']),
            Permission::updateOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web'], ['label' => 'เปลี่ยนสถานะ user']),
        ]);

        if (app(UserRepositoryInterface::class)->findByEmail('admin@example.com') !== null) {
            return;
        }

        app(CreateInternalUserUseCase::class)->execute(new CreateInternalUserData(
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin',
            role: 'admin',
            firstname: 'System',
            lastname: 'Administrator',
        ));
    }
}
