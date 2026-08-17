<?php

namespace App\Modules\User\Application\Queries;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ListUserSessionsQuery
{
    public function execute(int $userId): Collection
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->orderByDesc('last_activity')
            ->get();
    }
}
