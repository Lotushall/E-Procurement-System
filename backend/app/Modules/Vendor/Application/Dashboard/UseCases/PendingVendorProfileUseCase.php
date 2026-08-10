<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class PendingVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->resubmit();
        $this->vendors->saveProfile($profile);

        app_log('Vendor profile set back to pending', [
            'vendor_profile_id' => $vendorProfileId,
        ], 'info', 'vendor');
    }
}
