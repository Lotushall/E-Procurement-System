<?php

namespace App\Modules\Vendor\Application\Profile\DTOs;

use Spatie\LaravelData\Data;

final class UpdateVendorContactData extends Data
{
    public function __construct(
        public readonly string $contactName,
        public readonly ?string $contactPosition,
        public readonly ?string $contactPhone,
        public readonly ?string $contactEmail,
        public readonly ?string $lineId,
        public readonly ?string $otherContact,
        public readonly bool $isMainContact,
        public readonly ?int $id = null,
    ) {}
}
