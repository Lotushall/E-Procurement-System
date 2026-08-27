<?php

namespace App\Modules\InternalProfiles\Application\Queries;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;

final class ListAvailableInternalProfilesQuery
{
    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function execute(): array
    {
        return InternalProfiles::query()
            ->whereNull('user_id')
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->get(['id', 'prefix', 'firstname', 'lastname', 'employee_no'])
            ->map(fn (InternalProfiles $profile): array => [
                'id' => $profile->id,
                'name' => self::formatName($profile),
            ])
            ->all();
    }

    private static function formatName(InternalProfiles $profile): string
    {
        $name = implode(' ', array_filter([$profile->prefix, $profile->firstname, $profile->lastname]));

        return $profile->employee_no !== null
            ? "{$name} ({$profile->employee_no})"
            : $name;
    }
}
