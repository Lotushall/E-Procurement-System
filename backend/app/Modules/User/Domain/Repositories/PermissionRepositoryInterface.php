<?php

namespace App\Modules\User\Domain\Repositories;

use Spatie\Permission\Models\Permission;

interface PermissionRepositoryInterface
{
    public function create(string $name, string $label): Permission;

    public function update(string $name, string $newName, string $label): Permission;

    /**
     * Returns the deleted permission so the caller can log its id/name
     * without a redundant lookup.
     */
    public function delete(string $name): Permission;
}
