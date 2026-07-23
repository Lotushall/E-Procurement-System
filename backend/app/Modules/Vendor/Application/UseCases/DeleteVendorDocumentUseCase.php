<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class DeleteVendorDocumentUseCase
{
    private const DISK = 'local';

    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ResubmitVendorProfileOnChange $resubmitter,
    ) {}

    public function execute(int $vendorProfileId, int $documentId): void
    {
        DB::transaction(function () use ($vendorProfileId, $documentId): void {
            $document = $this->findOwnedDocument($vendorProfileId, $documentId);

            if ($document === null) {
                throw new ModelNotFoundException(
                    "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
                );
            }

            $filePath = $document->filePath();

            $this->vendors->deleteDocument($document);

            Storage::disk(self::DISK)->delete($filePath);

            app_log('Vendor document deleted', [
                'vendor_profile_id' => $vendorProfileId,
                'document_type' => $document->documentType(),
            ], 'info', 'vendor');

            ($this->resubmitter)($vendorProfileId);
        });
    }

    private function findOwnedDocument(int $vendorProfileId, int $documentId): ?VendorDocument
    {
        foreach ($this->vendors->findDocumentsByVendorProfileId($vendorProfileId) as $document) {
            if ($document->id() === $documentId) {
                return $document;
            }
        }

        return null;
    }
}
