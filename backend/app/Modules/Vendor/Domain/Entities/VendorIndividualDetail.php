<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

final class VendorIndividualDetail
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly ?string $prefix,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly CitizenId $citizenId,
        public readonly ?string $shopName,
        public readonly ?string $businessType,
        public readonly ?TaxId $taxId,
        public readonly ?Email $email,
        public readonly PhoneNumber $phone,
        public readonly ?string $address,
        public readonly ?string $country,
        public readonly ?string $province,
        public readonly ?PostalCode $postalCode,
        public readonly ?string $contactName,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
    ) {}
}
