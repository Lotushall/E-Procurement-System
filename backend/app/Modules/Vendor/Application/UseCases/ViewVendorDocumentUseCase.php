<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class ViewVendorDocumentUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(?int $vendorProfileId, int $documentId): VendorDocument
    {
        $document = $vendorProfileId !== null
            ? $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId)
            : $this->vendors->findDocumentById($documentId);

        if ($document === null) {
            throw new ModelNotFoundException(
                $vendorProfileId !== null
                    ? "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
                    : "Vendor document {$documentId} not found."
            );
        }

        return $document;
    }
}
