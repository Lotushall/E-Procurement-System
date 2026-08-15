<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\RoleData;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class CreateRoleUseCase
{
    public function execute(RoleData $data): Role
    {
        return DB::transaction(function () use ($data): Role {
            $role = Role::create(['name' => $data->name, 'guard_name' => 'web']);
            $role->syncPermissions($data->permissions);

            app_log('Role created', [
                'role_id' => $role->id,
                'name' => $role->name,
            ], 'info', 'user');

            return $role->load('permissions')->loadCount('users');
        });
    }
}
