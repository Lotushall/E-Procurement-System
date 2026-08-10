<?php

namespace App\Modules\Vendor\Application\Profile\Services;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;

final class ResubmitVendorProfileOnChange
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function __invoke(int $vendorProfileId, string $reason = 'a profile change'): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null || $profile->isPending()) {
            return;
        }

        $profile->resubmit();
        $this->vendors->saveProfile($profile);

        app_log("Vendor profile resubmitted for review after {$reason}", [
            'vendor_profile_id' => $vendorProfileId,
        ], 'info', 'vendor');
    }
}
