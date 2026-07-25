<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
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
        $filePath = DB::transaction(function () use ($vendorProfileId, $documentId): string {
            $document = $this->vendors->findDocumentByVendorProfileIdAndId($vendorProfileId, $documentId);

            if ($document === null) {
                throw new ModelNotFoundException(
                    "Vendor document {$documentId} not found for vendor profile {$vendorProfileId}."
                );
            }

            $filePath = $document->filePath();

            $this->vendors->deleteDocument($document);

            app_log('Vendor document deleted', [
                'vendor_profile_id' => $vendorProfileId,
                'document_type' => $document->documentType(),
            ], 'info', 'vendor');

            ($this->resubmitter)($vendorProfileId, 'a document change');

            return $filePath;
        });

        Storage::disk(self::DISK)->delete($filePath);
    }
}
