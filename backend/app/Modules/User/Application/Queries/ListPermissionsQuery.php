<?php

namespace App\Modules\User\Application\Queries;

use Spatie\Permission\Models\Permission;

final class ListPermissionsQuery
{
    /**
     * @return array<int, array{name: string, label: string, group: string}>
     */
    public function execute(): array
    {
        return Permission::query()
            ->orderBy('id')
            ->get()
            ->map(fn (Permission $permission): array => [
                'name' => $permission->name,
                'label' => $permission->label ?? $permission->name,
                'group' => explode('.', $permission->name)[0],
            ])
            ->all();
    }
}
