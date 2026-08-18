<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\RoleRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class DeleteRoleUseCase
{
    public function __construct(
        private readonly RoleRepositoryInterface $roles,
    ) {}

    /**
     * @return string|null an error message if the delete was blocked, null on success
     */
    public function execute(int $id): ?string
    {
        return DB::transaction(function () use ($id): ?string {
            $role = $this->roles->findOrFail($id);

            if ($role->name === 'admin') {
                return 'ไม่สามารถลบ role admin ได้';
            }

            if ($role->users_count > 0) {
                return 'ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้';
            }

            $this->roles->delete($id);

            app_log('Role deleted', [
                'role_id' => $role->id,
                'name' => $role->name,
            ], 'info', 'user');

            return null;
        });
    }
}
