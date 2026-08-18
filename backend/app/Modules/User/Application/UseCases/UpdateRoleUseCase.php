<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Domain\Repositories\RoleRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final class UpdateRoleUseCase
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles,
    ) {}

    /**
     * @return Role|string the updated role, or an error message if the update was blocked
     */
    public function execute(int $id, RoleData $data): Role|string
    {
        return DB::transaction(function () use ($id, $data): Role|string {
            $current = $this->roles->findOrFail($id);

            if ($current->name === 'admin' && $data->name !== 'admin') {
                return 'ไม่สามารถเปลี่ยนชื่อ role admin ได้';
            }

            $role = $this->roles->update($id, $data->name, $data->permissions);

            app_log('Role updated', [
                'role_id' => $role->id,
                'previous_name' => $current->name,
                'name' => $role->name,
            ], 'info', 'user');

            return $role;
        });
    }
}
