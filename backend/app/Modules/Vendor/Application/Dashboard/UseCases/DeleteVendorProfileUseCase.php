<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\User\Application\UseCases\RevokeAllUserSessionsUseCase;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

final class DeleteVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly UserRepositoryInterface $users,
        private readonly RevokeAllUserSessionsUseCase $revokeAllSessions,
    ) {}

    public function execute(int $vendorProfileId, int $actingUserId): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw (new ModelNotFoundException)->setModel(VendorProfile::class, [$vendorProfileId]);
        }

        $userId = $profile->userId();

        DB::transaction(function () use ($vendorProfileId, $userId): void {
            $this->users->delete($userId);
            $this->vendors->freeIdentityForDeletedProfile($vendorProfileId);
            $this->revokeAllSessions->execute($userId);
        });

        app_log('Vendor profile deleted', [
            'vendor_profile_id' => $vendorProfileId,
            'linked_user_id' => $userId,
            'acting_user_id' => $actingUserId,
        ], 'info', 'vendor');
    }
}
