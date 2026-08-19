<?php

namespace App\Modules\User\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListUsersQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $type = null,
        ?string $status = null,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        return User::query()
            ->select(['id', 'username', 'email', 'user_type', 'status', 'created_at'])
            ->with([
                'UserInternalProfile',
                'UserVendorProfile.VendorProfilesCompanyDetail',
                'UserVendorProfile.VendorProfilesIndividualDetail',
            ])
            ->type($type)
            ->status($status)
            ->search($search)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id')
            ->paginate(perPage: $perPage ?? self::DEFAULT_PER_PAGE, page: $page ?? 1);
    }
}
