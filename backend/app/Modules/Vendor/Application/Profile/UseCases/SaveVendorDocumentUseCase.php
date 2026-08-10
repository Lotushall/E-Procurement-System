<?php

namespace App\Modules\Vendor\Application\Profile\UseCases;

use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\Profile\Services\ResubmitVendorProfileOnChange;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class SaveVendorDocumentUseCase
{
    private const DISK = 'local';

    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ResubmitVendorProfileOnChange $resubmitter,
    ) {}

    public function execute(int $vendorProfileId, UpdateVendorDocumentData $data): void
    {
        DB::transaction(function () use ($vendorProfileId, $data): void {
            $filePath = $data->file->store("vendor-documents/{$vendorProfileId}", self::DISK);
            $fileName = $data->file->getClientOriginalName();

            $existing = $this->vendors->findDocumentByVendorProfileIdAndType($vendorProfileId, $data->documentType);

            if ($existing !== null) {
                $previousFilePath = $existing->filePath();

                $existing->reupload($fileName, $filePath);
                $this->vendors->saveDocument($existing);

                Storage::disk(self::DISK)->delete($previousFilePath);

                app_log('Vendor document reuploaded', [
                    'vendor_profile_id' => $vendorProfileId,
                    'document_type' => $data->documentType,
                ], 'info', 'vendor');
            } else {
                $this->vendors->saveDocument(VendorDocument::create(
                    vendorProfileId: $vendorProfileId,
                    documentType: $data->documentType,
                    fileName: $fileName,
                    filePath: $filePath,
                ));

                app_log('Vendor document uploaded', [
                    'vendor_profile_id' => $vendorProfileId,
                    'document_type' => $data->documentType,
                ], 'info', 'vendor');
            }

            ($this->resubmitter)($vendorProfileId, 'a document change');
        });
    }
}
