<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;
use App\Modules\User\Application\UseCases\RevokeAllUserSessionsUseCase;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class DeleteInternalProfileUseCase
{
    public function __construct(
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    /**
     * @return string|null an error message if the delete was blocked, null on success
     */
    public function execute(int $id, int $actingUserId): ?string
    {
        $profile = $this->internalProfiles->findById($id)
            ?? throw (new ModelNotFoundException)->setModel(InternalProfile::class, [$id]);

        $linkedUserId = $profile->userId();

        if ($linkedUserId !== null) {
            if ($linkedUserId === $actingUserId) {
                return 'ไม่สามารถลบบัญชีของตัวเองได้';
            }

            $this->users->delete($linkedUserId);
            $this->revokeAllSessions->execute($linkedUserId);
        }

        $this->internalProfiles->delete($id);

        app_log('Internal profile deleted', [
            'internal_profile_id' => $id,
            'linked_user_id' => $linkedUserId,
        ], 'info', 'user');

        return null;
    }
}
