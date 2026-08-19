<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Spatie\ModelStates\Exceptions\CouldNotPerformTransition;

final class UpdateUserStatusUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    /**
     * @return string|null an error message if the transition was rejected, null on success
     */
    public function execute(int $id, string $status, int $actingUserId): ?string
    {
        try {
            $this->users->updateStatus($id, $status);
        } catch (CouldNotPerformTransition) {
            return 'ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากไม่ใช่การเปลี่ยนสถานะที่อนุญาต';
        }

        app_log('User status changed', [
            'user_id' => $id,
            'status' => $status,
            'acting_user_id' => $actingUserId,
        ], 'info', 'user');

        return null;
    }
}
