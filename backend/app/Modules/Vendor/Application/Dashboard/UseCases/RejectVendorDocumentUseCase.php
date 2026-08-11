<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class RejectVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly NotificationSenderInterface $notifications,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy, string $remark, bool $sendEmail = true): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->reject($verifiedBy, $remark);
        $this->vendors->saveDocument($document);

        $profile = $this->vendors->findProfileById($vendorProfileId);

        if ($profile === null) {
            throw new ModelNotFoundException("Vendor profile {$vendorProfileId} not found.");
        }

        $this->notifications->send(
            [$profile->userId()],
            new VendorDocumentRejectedNotification($document->documentType(), $remark, $sendEmail)
        );

        app_log('Vendor document rejected', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
