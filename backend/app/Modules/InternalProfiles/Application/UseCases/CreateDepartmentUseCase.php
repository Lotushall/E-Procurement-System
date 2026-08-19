<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Application\DTOs\DepartmentData;
use App\Modules\InternalProfiles\Domain\Repositories\DepartmentRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\Department;

final class CreateDepartmentUseCase
{
    public function __construct(
        private readonly DepartmentRepositoryInterface $departments,
    ) {}

    public function execute(DepartmentData $data): Department
    {
        $department = $this->departments->create($data->name);

        app_log('Department created', [
            'department_id' => $department->id,
            'name' => $department->name,
        ], 'info', 'user');

        return $department;
    }
}
