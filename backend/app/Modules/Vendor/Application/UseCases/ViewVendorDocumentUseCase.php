<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use DomainException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

final class ViewVendorDocumentUseCase
{
    private const DISK = 'local';

    /** @var list<string> */
    private const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];  

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

        $mimeType = File::mimeType(Storage::disk(self::DISK)->path($document->filePath()));

        if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            app_log('Vendor document rejected: stored file type does not match an allowed type', [
                'vendor_profile_id' => $document->vendorProfileId(),
                'document_id' => $document->id(),
                'detected_mime_type' => $mimeType,
            ], 'warning', 'vendor');

            throw new DomainException(
                "Vendor document {$documentId} has an unexpected file type and cannot be viewed."
            );
        }

        app_log('Vendor document viewed', [
            'vendor_profile_id' => $document->vendorProfileId(),
            'document_id' => $document->id(),
            'document_type' => $document->documentType(),
        ], 'info', 'vendor');

        return $document;
    }
}
