<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;

final class ListDepartmentOptionsQuery
{
    public const CACHE_KEY = 'internal-profiles.departments.select';

    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return app_cache_remember(self::CACHE_KEY, null, function (): array {
            return Department::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Department $department): array => [
                    'id' => $department->id,
                    'name' => $department->name,
                ])
                ->all();
        });
    }
}
