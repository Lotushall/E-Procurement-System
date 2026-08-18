<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Domain\Repositories\PermissionRepositoryInterface;
use Spatie\Permission\Models\Permission;

final class CreatePermissionUseCase
{
    public function __construct(
        private readonly PermissionRepositoryInterface $permissions,
    ) {}

    public function execute(PermissionData $data): Permission
    {
        $permission = $this->permissions->create($data->name, $data->label);

        app_log('Permission created', [
            'permission_id' => $permission->id,
            'name' => $permission->name,
        ], 'info', 'user');

        return $permission;
    }
}
