<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Shared\Support\ChangeLogger;
use Illuminate\Support\Facades\DB;

final class UpdateVendorInfoUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ChangeLogger $changeLogger,
    ) {}

    public function execute(int $vendorProfileId, UpdateVendorInfoData $data): void
    {
        DB::transaction(function () use ($vendorProfileId, $data): void {
            if ($data->isCompany()) {
                $this->updateCompanyDetail($vendorProfileId, $data);
            } else {
                $this->updateIndividualDetail($vendorProfileId, $data);
            }
        });
    }

    private function updateCompanyDetail(int $vendorProfileId, UpdateVendorInfoData $data): void
    {
        $existing = $this->vendors->findCompanyDetailByVendorProfileId($vendorProfileId);

        $taxId = TaxId::fromString($this->resolveMaskedValue($data->taxId, $existing?->taxId()->value));

        $businessRegistrationNo = $this->resolveMaskedValue(
            $data->businessRegistrationNo,
            $existing?->businessRegistrationNo()
        );

        $postalCode = PostalCode::fromString($data->postalCode);

        if ($existing === null) {
            $this->vendors->saveCompanyDetail(VendorCompanyDetail::create(
                vendorProfileId: $vendorProfileId,
                companyName: $data->companyName,
                businessRegistrationNo: $businessRegistrationNo,
                taxId: $taxId,
                branchNo: $data->branchNo,
                businessType: $data->businessType,
                address: $data->address,
                province: $data->province,
                postalCode: $postalCode,
            ));

            app_log('Vendor company detail created via info update', [
                'vendor_profile_id' => $vendorProfileId,
            ], 'info', 'vendor');

            return;
        }

        $before = [
            'companyName' => $existing->companyName(),
            'businessRegistrationNo' => $existing->businessRegistrationNo(),
            'taxId' => $existing->taxId()->value,
            'branchNo' => $existing->branchNo(),
            'businessType' => $existing->businessType(),
            'address' => $existing->address(),
            'province' => $existing->province(),
            'postalCode' => $existing->postalCode()?->value,
        ];

        $existing->update(
            companyName: $data->companyName,
            businessRegistrationNo: $businessRegistrationNo,
            taxId: $taxId,
            branchNo: $data->branchNo,
            businessType: $data->businessType,
            address: $data->address,
            province: $data->province,
            postalCode: $postalCode,
        );

        $this->vendors->saveCompanyDetail($existing);

        $this->changeLogger->log(
            message: 'Vendor company detail updated',
            before: $before,
            after: [
                'companyName' => $data->companyName,
                'businessRegistrationNo' => $businessRegistrationNo,
                'taxId' => $taxId->value,
                'branchNo' => $data->branchNo,
                'businessType' => $data->businessType,
                'address' => $data->address,
                'province' => $data->province,
                'postalCode' => $postalCode->value,
            ],
            context: ['vendor_profile_id' => $vendorProfileId],
            sensitiveFields: ['taxId', 'businessRegistrationNo'],
            channel: 'vendor',
        );
    }

    private function updateIndividualDetail(int $vendorProfileId, UpdateVendorInfoData $data): void
    {
        $existing = $this->vendors->findIndividualDetailByVendorProfileId($vendorProfileId);

        $citizenId = CitizenId::fromString(
            $this->resolveMaskedValue($data->citizenId, $existing?->citizenId()->value)
        );
        $taxIdValue = $this->resolveMaskedValue($data->taxId, $existing?->taxId()?->value);
        $taxId = $taxIdValue !== null ? TaxId::fromString($taxIdValue) : null;
        $postalCode = PostalCode::fromString($data->postalCode);

        if ($existing === null) {
            $this->vendors->saveIndividualDetail(VendorIndividualDetail::create(
                vendorProfileId: $vendorProfileId,
                storeName: $data->storeName,
                prefix: $data->prefix,
                firstname: $data->firstname,
                lastname: $data->lastname,
                citizenId: $citizenId,
                businessType: $data->businessType,
                taxId: $taxId,
                address: $data->address,
                province: $data->province,
                postalCode: $postalCode,
            ));

            app_log('Vendor individual detail created via info update', [
                'vendor_profile_id' => $vendorProfileId,
            ], 'info', 'vendor');

            return;
        }

        $before = [
            'storeName' => $existing->storeName(),
            'prefix' => $existing->prefix(),
            'firstname' => $existing->firstname(),
            'lastname' => $existing->lastname(),
            'citizenId' => $existing->citizenId()->value,
            'businessType' => $existing->businessType(),
            'taxId' => $existing->taxId()?->value,
            'address' => $existing->address(),
            'province' => $existing->province(),
            'postalCode' => $existing->postalCode()?->value,
        ];

        $existing->update(
            storeName: $data->storeName,
            prefix: $data->prefix,
            firstname: $data->firstname,
            lastname: $data->lastname,
            citizenId: $citizenId,
            businessType: $data->businessType,
            taxId: $taxId,
            address: $data->address,
            province: $data->province,
            postalCode: $postalCode,
        );

        $this->vendors->saveIndividualDetail($existing);

        $this->changeLogger->log(
            message: 'Vendor individual detail updated',
            before: $before,
            after: [
                'storeName' => $data->storeName,
                'prefix' => $data->prefix,
                'firstname' => $data->firstname,
                'lastname' => $data->lastname,
                'citizenId' => $citizenId->value,
                'businessType' => $data->businessType,
                'taxId' => $taxId?->value,
                'address' => $data->address,
                'province' => $data->province,
                'postalCode' => $postalCode->value,
            ],
            context: ['vendor_profile_id' => $vendorProfileId],
            sensitiveFields: ['taxId', 'citizenId'],
            channel: 'vendor',
        );
    }

    /**
     * Frontend echoes sensitive IDs back masked (e.g. "xxxxxxxxx1234"). If the
     * submitted value still carries mask characters, the field was never
     * edited by the user, so keep the currently stored value instead of
     * persisting the mask itself.
     */
    private function resolveMaskedValue(?string $incoming, ?string $current): ?string
    {
        if ($incoming === null) {
            return null;
        }

        if ($current !== null && stripos($incoming, 'x') !== false) {
            return $current;
        }

        return $incoming;
    }
}
