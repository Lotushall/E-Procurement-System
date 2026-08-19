<?php

namespace App\Modules\InternalProfiles\Domain\Repositories;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use Illuminate\Database\Eloquent\ModelNotFoundException;

interface DepartmentRepositoryInterface
{
    /**
     * @throws ModelNotFoundException
     */
    public function findOrFail(int $id): Department;

    public function create(string $name): Department;

    public function update(int $id, string $name): Department;

    public function delete(int $id): void;
}
