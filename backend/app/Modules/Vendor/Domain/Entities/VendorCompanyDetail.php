<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

final class VendorCompanyDetail
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly string $companyName,
        public readonly ?string $businessRegistrationNo,
        public readonly TaxId $taxId,
        public readonly ?string $branchNo,
        public readonly ?string $businessType,
        public readonly ?string $address,
        public readonly ?string $country,
        public readonly ?string $province,
        public readonly ?PostalCode $postalCode,
        public readonly ?string $contactName,
        public readonly ?string $contactPosition,
        public readonly PhoneNumber $contactPhone,
        public readonly Email $contactEmail,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
    ) {}
}
