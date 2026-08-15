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
            Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
            // Temporary: the users.create/update/updateStatus/roles.manage API endpoints don't
            // exist yet (see docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md
            // and docs/superpowers/specs/2026-08-14-role-permission-management-design.md) —
            // granted early so the already-shipped frontend UI is visible for local QA. The
            // real backend plans for those specs should revisit this grant once the endpoints ship.
            Permission::firstOrCreate(['name' => 'users.create', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'users.update', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'users.updateStatus', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'roles.manage', 'guard_name' => 'web']),
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
