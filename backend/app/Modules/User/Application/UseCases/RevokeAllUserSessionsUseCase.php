<?php

namespace App\Modules\User\Application\UseCases;

use Illuminate\Support\Facades\DB;

final class RevokeAllUserSessionsUseCase
{
    public function execute(int $userId, ?string $keepSessionId = null): void
    {
        DB::table('sessions')
            ->where('user_id', $userId)
            ->when($keepSessionId !== null, fn ($query) => $query->where('id', '!=', $keepSessionId))
            ->delete();
    }
}
