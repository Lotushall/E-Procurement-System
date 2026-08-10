<?php

namespace App\Modules\Vendor\Application\Profile\DTOs;

use Spatie\LaravelData\Data;

final class UpdateVendorInfoData extends Data
{
    public function __construct(
        public readonly string $vendorType,
        public readonly ?string $companyName,
        public readonly ?string $businessRegistrationNo,
        public readonly ?string $branchNo,
        public readonly ?string $storeName,
        public readonly ?string $prefix,
        public readonly ?string $firstname,
        public readonly ?string $lastname,
        public readonly ?string $citizenId,
        public readonly string $businessType,
        public readonly ?string $taxId,
        public readonly string $address,
        public readonly string $province,
        public readonly string $postalCode,
    ) {}

    public function isCompany(): bool
    {
        return $this->vendorType === 'company';
    }
}
