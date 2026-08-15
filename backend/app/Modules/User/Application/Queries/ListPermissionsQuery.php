<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Domain\Enums\Permission;

final class ListPermissionsQuery
{
    /**
     * @return array<int, array{name: string, label: string, group: string}>
     */
    public function execute(): array
    {
        return array_map(
            fn (Permission $permission): array => [
                'name' => $permission->value,
                'label' => $permission->label(),
                'group' => $permission->group(),
            ],
            Permission::cases(),
        );
    }
}
