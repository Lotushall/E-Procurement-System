<?php

namespace App\Modules\Vendor\Application\Profile\UseCases;

use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Exceptions\VendorIdentityAlreadyRegisteredException;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Shared\Support\ChangeLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

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

        $taxId = $this->resolveTaxId($data->taxId, $existing?->taxId());

        $businessRegistrationNo = $this->resolveMaskedValue(
            $data->businessRegistrationNo,
            $existing?->businessRegistrationNo()
        );

        $postalCode = PostalCode::fromString($data->postalCode);

        $this->ensureIdentityIsFree($vendorProfileId, $taxId->value, null, $businessRegistrationNo);

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

        $citizenIdValue = $this->resolveMaskedValue($data->citizenId, $existing?->citizenId()->value);
        $citizenId = $existing !== null && $citizenIdValue === $existing->citizenId()->value
            ? $existing->citizenId()
            : CitizenId::fromString($citizenIdValue);
        $taxId = $this->resolveTaxId($data->taxId, $existing?->taxId());
        $postalCode = PostalCode::fromString($data->postalCode);

        $this->ensureIdentityIsFree($vendorProfileId, $taxId?->value, $citizenId->value, null);

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
     * The tax ID to save. The stored one is kept as is, so a number saved
     * before the check digit was enforced does not block other edits; a new
     * number must pass the check digit.
     */
    private function resolveTaxId(?string $incoming, ?TaxId $current): ?TaxId
    {
        $value = $this->resolveMaskedValue($incoming, $current?->value);

        if ($value === null) {
            return null;
        }

        return $value === $current?->value ? $current : TaxId::fromString($value);
    }

    /**
     * @throws VendorIdentityAlreadyRegisteredException when another vendor already holds one of the numbers
     */
    private function ensureIdentityIsFree(int $vendorProfileId, ?string $taxId, ?string $citizenId, ?string $businessRegistrationNo): void
    {
        if ($this->vendors->isIdentityTakenByAnotherVendor($taxId, $citizenId, $businessRegistrationNo, $vendorProfileId)) {
            throw new VendorIdentityAlreadyRegisteredException;
        }
    }

    /**
     * Frontend echoes sensitive IDs back masked (e.g. "xxxxxxxxx1234"). If the
     * submitted value still carries mask characters, the field was never
     * edited by the user, so keep the currently stored value instead of
     * persisting the mask itself. A masked value with nothing stored behind
     * it cannot stand for anything and is rejected.
     */
    private function resolveMaskedValue(?string $incoming, ?string $current): ?string
    {
        if ($incoming === null) {
            return null;
        }

        if (stripos($incoming, 'x') === false) {
            return $incoming;
        }

        if ($current === null) {
            throw new InvalidArgumentException('A masked identification number was sent but none is stored.');
        }

        return $current;
    }
}
