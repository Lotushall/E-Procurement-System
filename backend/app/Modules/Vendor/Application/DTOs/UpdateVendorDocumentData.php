<?php

namespace App\Modules\Vendor\Application\DTOs;

use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;

final class UpdateVendorDocumentData extends Data
{
    public function __construct(
        public readonly string $documentType,
        public readonly UploadedFile $file,
    ) {}
}
