<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\Position;

final class ListPositionOptionsQuery
{
    public const CACHE_KEY = 'internal-profiles.positions.select';

    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return app_cache_remember(self::CACHE_KEY, null, function (): array {
            return Position::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Position $position): array => [
                    'id' => $position->id,
                    'name' => $position->name,
                ])
                ->all();
        });
    }
}
