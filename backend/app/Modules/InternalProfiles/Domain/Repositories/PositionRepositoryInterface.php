<?php

namespace App\Modules\InternalProfiles\Domain\Repositories;

use App\Modules\InternalProfiles\Infrastructure\Models\Position;
use Illuminate\Database\Eloquent\ModelNotFoundException;

interface PositionRepositoryInterface
{
    /**
     * @throws ModelNotFoundException
     */
    public function findOrFail(int $id): Position;

    public function create(string $name): Position;

    public function update(int $id, string $name): Position;

    public function delete(int $id): void;
}
