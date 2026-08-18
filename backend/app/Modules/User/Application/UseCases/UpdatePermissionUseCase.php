<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Domain\Repositories\PermissionRepositoryInterface;
use Spatie\Permission\Models\Permission;

final class UpdatePermissionUseCase
{
    /**
     * No safeguard by design: a permission's name can be changed even while it
     * is referenced literally by a `can:`/policy check elsewhere in the app
     * (e.g. `can:users.update`, `VendorProfilePolicy`) — renaming such a
     * permission will deny everyone on the routes that depend on the old name.
     * This is an accepted risk, confirmed after being surfaced during review —
     * see Safeguard 3 in docs/superpowers/specs/2026-08-18-role-permission-crud-completion-design.md.
     */
    public function __construct(
        private readonly PermissionRepositoryInterface $permissions,
    ) {}

    public function execute(string $name, PermissionData $data): Permission
    {
        $permission = $this->permissions->update($name, $data->name, $data->label);

        app_log('Permission updated', [
            'permission_id' => $permission->id,
            'previous_name' => $name,
            'name' => $permission->name,
        ], 'info', 'user');

        return $permission;
    }
}
