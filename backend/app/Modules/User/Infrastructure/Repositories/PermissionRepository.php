<?php

namespace App\Modules\User\Infrastructure\Repositories;

use App\Modules\User\Domain\Repositories\PermissionRepositoryInterface;
use Spatie\Permission\Models\Permission;

class PermissionRepository implements PermissionRepositoryInterface
{
    public function create(string $name, string $label): Permission
    {
        return Permission::create([
            'name' => $name,
            'label' => $label,
            'guard_name' => 'web',
        ]);
    }

    public function update(string $name, string $newName, string $label): Permission
    {
        $permission = Permission::where('name', $name)->firstOrFail();
        $permission->name = $newName;
        $permission->label = $label;
        $permission->save();

        return $permission;
    }

    public function delete(string $name): Permission
    {
        $permission = Permission::where('name', $name)->firstOrFail();
        $permission->delete();

        return $permission;
    }
}
