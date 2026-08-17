<?php

namespace App\Modules\User\Infrastructure\Repositories;

use App\Modules\User\Domain\Repositories\UserSessionRepositoryInterface;
use Illuminate\Support\Facades\DB;

class UserSessionRepository implements UserSessionRepositoryInterface
{
    public function revokeByUserAndSessionId(int $userId, string $sessionId): void
    {
        DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', $sessionId)
            ->delete();
    }

    public function revokeAllByUser(int $userId, ?string $keepSessionId = null): void
    {
        DB::table('sessions')
            ->where('user_id', $userId)
            ->when($keepSessionId !== null, fn($query) => $query->where('id', '!=', $keepSessionId))
            ->delete();
    }
}
