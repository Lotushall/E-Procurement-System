<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class DeleteUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    /**
     * @return string|null an error message if the delete was blocked, null on success
     */
    public function execute(int $id, int $actingUserId): ?string
    {
        if ($id === $actingUserId) {
            return 'ไม่สามารถลบบัญชีของตัวเองได้';
        }

        return DB::transaction(function () use ($id, $actingUserId): ?string {
            $this->users->delete($id);

            $this->revokeAllSessions->execute($id);

            app_log('User deleted', [
                'deleted_user_id' => $id,
                'acting_user_id' => $actingUserId,
            ], 'info', 'user');

            return null;
        });
    }
}
