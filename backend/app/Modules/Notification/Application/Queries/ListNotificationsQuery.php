<?php

namespace App\Modules\Notification\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListNotificationsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        int $userId,
        ?string $status = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $query = User::query()->findOrFail($userId)->notifications();

        if ($status === 'unread') {
            $query->whereNull('read_at');
        } elseif ($status === 'read') {
            $query->whereNotNull('read_at');
        }

        return $query
            ->latest('created_at')
            ->paginate(
                perPage: $perPage ?? self::DEFAULT_PER_PAGE,
                page: $page ?? 1,
            );
    }
}
