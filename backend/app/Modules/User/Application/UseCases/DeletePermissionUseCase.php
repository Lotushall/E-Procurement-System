<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\PermissionRepositoryInterface;

final class DeletePermissionUseCase
{
    /**
     * No safeguard by design: a permission can be deleted even while assigned to
     * roles (detached automatically via the DB's cascadeOnDelete FK) or while it
     * is referenced literally by a `can:`/policy check elsewhere in the app
     * (e.g. `can:users.update`, `VendorProfilePolicy`) — deleting such a
     * permission will deny everyone on the routes that depend on it. This is an
     * accepted risk, confirmed after being surfaced during review — see
     * Safeguard 3 in docs/superpowers/specs/2026-08-18-role-permission-crud-completion-design.md.
     */
    public function __construct(
        private readonly PermissionRepositoryInterface $permissions,
    ) {}

    public function execute(string $name): void
    {
        $permission = $this->permissions->delete($name);

        app_log('Permission deleted', [
            'permission_id' => $permission->id,
            'name' => $permission->name,
        ], 'info', 'user');
    }
}
