<?php

namespace Database\Seeders;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
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
            Permission::updateOrCreate(['name' => 'vendors.viewAny', 'guard_name' => 'web'], ['label' => 'ดูรายชื่อผู้ค้า']),
            Permission::updateOrCreate(['name' => 'vendors.review', 'guard_name' => 'web'], ['label' => 'อนุมัติ/ปฏิเสธผู้ค้า']),
            Permission::updateOrCreate(['name' => 'vendors.delete', 'guard_name' => 'web'], ['label' => 'ลบผู้ค้า']),
            Permission::updateOrCreate(['name' => 'users.create', 'guard_name' => 'web'], ['label' => 'เพิ่ม user']),
            Permission::updateOrCreate(['name' => 'users.update', 'guard_name' => 'web'], ['label' => 'แก้ไข user']),
            Permission::updateOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web'], ['label' => 'เปลี่ยนสถานะ user']),
            Permission::updateOrCreate(['name' => 'users.delete', 'guard_name' => 'web'], ['label' => 'ลบ user']),
            Permission::updateOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web'], ['label' => 'สร้างโครงการจัดซื้อจัดจ้าง']),
            Permission::updateOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web'], ['label' => 'ดูรายการโครงการจัดซื้อจัดจ้าง']),
        ]);

        if (app(UserRepositoryInterface::class)->findByEmail('admin@example.com') !== null) {
            return;
        }

        $profile = InternalProfiles::create([
            'firstname' => 'System',
            'lastname' => 'Administrator',
        ]);

        app(CreateInternalUserUseCase::class)->execute(new CreateInternalUserData(
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin',
            role: 'admin',
            internalProfileId: $profile->id,
        ));
    }
}
