<?php

namespace App\Modules\User\Infrastructure\Repositories;

use App\Modules\User\Domain\Repositories\RoleRepositoryInterface;
use Spatie\Permission\Models\Role;

class RoleRepository implements RoleRepositoryInterface
{
    public function findOrFail(int $id): Role
    {
        return Role::with('permissions')->withCount('users')->findOrFail($id);
    }

    public function create(string $name, array $permissions): Role
    {
        $role = Role::create(['name' => $name, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        return $role->load('permissions')->loadCount('users');
    }

    public function update(int $id, string $name, array $permissions): Role
    {
        $role = Role::findOrFail($id);
        $role->name = $name;
        $role->save();
        $role->syncPermissions($permissions);

        return $role->load('permissions')->loadCount('users');
    }

    public function delete(int $id): void
    {
        Role::findOrFail($id)->delete();
    }
}
