<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorProfileUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly NotificationSenderInterface $notifications,
    ) {}

    public function execute(int $vendorProfileId, int $verifiedBy, string $remark, bool $sendEmail = true): void
    {
        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $profile->reject($verifiedBy, $remark);
        $this->vendors->saveProfile($profile);

        $this->notifications->send(
            [$profile->userId()],
            new VendorProfileRejectedNotification($profile->remark() ?? $remark, $sendEmail)
        );

        app_log('Vendor profile rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
