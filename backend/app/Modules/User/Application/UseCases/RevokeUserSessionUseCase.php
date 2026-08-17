<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserSessionRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class RevokeUserSessionUseCase
{
    public function __construct(
        private UserSessionRepositoryInterface $sessions,
    ) {}

    public function execute(int $userId, string $sessionId): void
    {
        $this->sessions->revokeByUserAndSessionId(
            $userId,
            $sessionId
        );
    }
}
