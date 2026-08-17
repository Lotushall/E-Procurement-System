<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserSessionRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class RevokeAllUserSessionsUseCase
{
    public function __construct(
        private UserSessionRepositoryInterface $sessions,
    ) {}

    public function execute(int $userId, ?string $keepSessionId = null): void
    {
        $this->sessions->revokeAllByUser(
            $userId,
            $keepSessionId
        );
    }
}
