<?php

namespace App\Modules\User\Application\UseCases;

use Illuminate\Support\Facades\DB;

final class RevokeUserSessionUseCase
{
    public function execute(int $userId, string $sessionId): void
    {
        DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', $sessionId)
            ->delete();
    }
}
