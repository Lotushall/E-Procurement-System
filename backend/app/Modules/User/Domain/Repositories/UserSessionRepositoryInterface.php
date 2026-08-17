<?php

namespace App\Modules\User\Domain\Repositories;

interface UserSessionRepositoryInterface
{
    public function revokeByUserAndSessionId(int $userId, string $sessionId): void;

    public function revokeAllByUser(int $userId, ?string $keepSessionId = null): void;
}
