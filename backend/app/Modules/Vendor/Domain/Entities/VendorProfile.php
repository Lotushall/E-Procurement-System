<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Vendor\Domain\States\VerificationStatus;
use Carbon\CarbonImmutable;

final class VendorProfile
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $userId,
        public readonly VerificationStatus $status,
        public readonly ?CarbonImmutable $verifiedAt,
        public readonly ?int $verifiedBy,
        public readonly ?string $remark,
    ) {}
}
