<?php

namespace App\Modules\InternalProfiles\Infrastructure\Repositories;

use App\Modules\InternalProfiles\Domain\Repositories\DepartmentRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\Department;

class DepartmentRepository implements DepartmentRepositoryInterface
{
    public function findOrFail(int $id): Department
    {
        return Department::withCount('internalProfiles')->findOrFail($id);
    }

    public function create(string $name): Department
    {
        $department = Department::create(['name' => $name]);

        return $department->loadCount('internalProfiles');
    }

    public function update(int $id, string $name): Department
    {
        $department = Department::findOrFail($id);
        $department->name = $name;
        $department->save();

        return $department->loadCount('internalProfiles');
    }

    public function delete(int $id): void
    {
        Department::findOrFail($id)->delete();
    }
}
