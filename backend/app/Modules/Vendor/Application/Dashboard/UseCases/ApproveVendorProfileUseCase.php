<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->approve($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        app_log('Vendor profile approved', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
