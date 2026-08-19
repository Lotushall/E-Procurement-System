<?php

namespace App\Modules\InternalProfiles\Infrastructure\Repositories;

use App\Modules\InternalProfiles\Domain\Repositories\PositionRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;

class PositionRepository implements PositionRepositoryInterface
{
    public function findOrFail(int $id): Position
    {
        return Position::withCount('internalProfiles')->findOrFail($id);
    }

    public function create(string $name): Position
    {
        $position = Position::create(['name' => $name]);

        return $position->loadCount('internalProfiles');
    }

    public function update(int $id, string $name): Position
    {
        $position = Position::findOrFail($id);
        $position->name = $name;
        $position->save();

        return $position->loadCount('internalProfiles');
    }

    public function delete(int $id): void
    {
        Position::findOrFail($id)->delete();
    }
}
