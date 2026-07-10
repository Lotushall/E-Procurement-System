<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Vendor\Domain\States\DocumentStatus;
use Carbon\CarbonImmutable;

final class VendorDocument
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $vendorProfileId,
        public readonly string $documentType,
        public readonly string $fileName,
        public readonly string $filePath,
        public readonly DocumentStatus $status,
        public readonly ?int $verifiedBy,
        public readonly ?CarbonImmutable $verifiedAt,
        public readonly ?string $remark,
    ) {}
}
