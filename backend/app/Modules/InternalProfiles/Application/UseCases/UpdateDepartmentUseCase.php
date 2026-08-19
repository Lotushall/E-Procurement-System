<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Application\DTOs\DepartmentData;
use App\Modules\InternalProfiles\Domain\Repositories\DepartmentRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\Department;

final class UpdateDepartmentUseCase
{
    public function __construct(
        private readonly DepartmentRepositoryInterface $departments,
    ) {}

    public function execute(int $id, DepartmentData $data): Department
    {
        $department = $this->departments->update($id, $data->name);

        app_log('Department updated', [
            'department_id' => $department->id,
            'name' => $department->name,
        ], 'info', 'user');

        return $department;
    }
}
