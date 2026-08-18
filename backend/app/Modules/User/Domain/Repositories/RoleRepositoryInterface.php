<?php

namespace App\Modules\User\Domain\Repositories;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Spatie\Permission\Models\Role;

interface RoleRepositoryInterface
{
    /**
     * @throws ModelNotFoundException
     */
    public function findOrFail(int $id): Role;

    /**
     * @param  array<int, string>  $permissions
     */
    public function create(string $name, array $permissions): Role;

    /**
     * @param  array<int, string>  $permissions
     */
    public function update(int $id, string $name, array $permissions): Role;

    public function delete(int $id): void;
}
