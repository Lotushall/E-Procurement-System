<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Domain\Repositories\InternalProfilesRepositoryInterface;

final class DeleteInternalProfileUseCase
{
    public function __construct(
        private readonly InternalProfilesRepositoryInterface $internalProfiles,
    ) {}

    public function execute(int $id): void
    {
        $this->internalProfiles->delete($id);

        app_log('Internal profile deleted', [
            'internal_profile_id' => $id,
        ], 'info', 'user');
    }
}
