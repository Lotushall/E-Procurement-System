<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Carbon\CarbonImmutable;
use Throwable;

final class PurgeSoftDeletedUsersUseCase
{
    private const RETENTION_DAYS = 30;

    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(): int
    {
        $cutoff = CarbonImmutable::now()->subDays(self::RETENTION_DAYS);
        $ids = $this->users->findIdsDeletedBefore($cutoff);
        $purged = 0;

        foreach ($ids as $id) {
            try {
                $this->vendors->deleteDocumentFilesForUser($id);
                $this->users->forceDelete($id);

                app_log('User purged (hard delete)', ['user_id' => $id], 'info', 'user');

                $purged++;
            } catch (Throwable $exception) {
                app_log('User purge failed', [
                    'user_id' => $id,
                    'error' => $exception->getMessage(),
                ], 'error', 'user');
            }
        }

        return $purged;
    }
}
