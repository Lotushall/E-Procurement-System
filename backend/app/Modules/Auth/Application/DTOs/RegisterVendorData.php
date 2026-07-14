<?php

namespace App\Modules\Auth\Application\DTOs;

use Spatie\LaravelData\Data;

final class RegisterVendorData extends Data
{
    public function __construct(
        public readonly string $vendorType,
        public readonly ?string $companyName,
        public readonly ?string $taxId,
        public readonly ?string $fullName,
        public readonly ?string $idCard,
        public readonly ?string $storeName,
        public readonly string $phone,
        public readonly string $username,
        public readonly string $email,
        public readonly string $password,
    ) {}

    public function isCompany(): bool
    {
        return $this->vendorType === 'company';
    }
}
