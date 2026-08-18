<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Domain\Repositories\RoleRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class CreateRoleUseCase
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles,
    ) {}

    public function execute(RoleData $data): Role
    {
        return DB::transaction(function () use ($data): Role {
            $role = $this->roles->create($data->name, $data->permissions);

            app_log('Role created', [
                'role_id' => $role->id,
                'name' => $role->name,
            ], 'info', 'user');

            return $role;
        });
    }
}
