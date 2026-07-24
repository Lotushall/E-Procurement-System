<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Vendor\Application\Services\ResubmitVendorProfileOnChange;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

final class DeleteVendorContactUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ResubmitVendorProfileOnChange $resubmitter,
    ) {}

    public function execute(int $vendorProfileId, int $contactId): void
    {
        DB::transaction(function () use ($vendorProfileId, $contactId): void {
            $contact = $this->vendors->findContactByVendorProfileIdAndId($vendorProfileId, $contactId);

            if ($contact === null) {
                throw new ModelNotFoundException(
                    "Vendor contact {$contactId} not found for vendor profile {$vendorProfileId}."
                );
            }

            $this->vendors->deleteContact($contact);

            app_log('Vendor contact deleted', [
                'vendor_profile_id' => $vendorProfileId,
            ], 'info', 'vendor');

            ($this->resubmitter)($vendorProfileId);
        });
    }
}
