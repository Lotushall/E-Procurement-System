<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;

final class ListInternalProfileOptionsQuery
{
    public const CACHE_KEY = 'internal-profiles.select';

    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return app_cache_remember(self::CACHE_KEY, null, function (): array {
            return InternalProfiles::query()
                ->orderBy('firstname')
                ->orderBy('lastname')
                ->get(['id', 'firstname', 'lastname', 'employee_no'])
                ->map(fn (InternalProfiles $profile): array => [
                    'id' => $profile->id,
                    'name' => self::formatName($profile),
                ])
                ->all();
        });
    }

    private static function formatName(InternalProfiles $profile): string
    {
        $name = implode(' ', array_filter([$profile->firstname, $profile->lastname]));

        return $profile->employee_no !== null
            ? "{$profile->employee_no} - {$name}"
            : $name;
    }
}
