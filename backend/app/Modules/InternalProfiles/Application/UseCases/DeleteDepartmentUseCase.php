<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Domain\Repositories\DepartmentRepositoryInterface;

final class DeleteDepartmentUseCase
{
    public function __construct(
        private readonly DepartmentRepositoryInterface $departments,
    ) {}

    /**
     * @return string|null an error message if the delete was blocked, null on success
     */
    public function execute(int $id): ?string
    {
        $department = $this->departments->findOrFail($id);

        if ($department->internal_profiles_count > 0) {
            return 'ไม่สามารถลบแผนกที่ยังมีผู้ใช้งานอยู่ได้';
        }

        $this->departments->delete($id);

        app_log('Department deleted', [
            'department_id' => $department->id,
            'name' => $department->name,
        ], 'info', 'user');

        return null;
    }
}
