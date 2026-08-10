<?php

namespace App\Modules\Vendor\Application\Dashboard\UseCases;

use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ApproveVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, int $documentId, int $verifiedBy): void
    {
        $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
            );
        }

        $document->approve($verifiedBy);
        $this->vendors->saveDocument($document);

        app_log('Vendor document approved', [
            'vendor_profile_id' => $vendorProfileId,
            'document_id' => $documentId,
            'verified_by' => $verifiedBy,
        ], 'info', 'vendor');
    }
}
