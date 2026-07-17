<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorCompanyDetailResource extends JsonResource
{
    public static $wrap = false;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'company',
            'companyName' => $this->company_name,
            'businessRegistrationNo' => self::maskSensitiveId($this->business_registration_no),
            'taxId' => self::maskSensitiveId($this->tax_id),
            'branchNo' => $this->branch_no,
            'businessType' => $this->business_type,
            'address' => $this->address,
            'country' => $this->country,
            'province' => $this->province,
            'postalCode' => $this->postal_code,
        ];
    }

    /**
     * Mask all but the last 4 characters of a sensitive identifier.
     */
    private static function maskSensitiveId(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (strlen($value) <= 4) {
            return str_repeat('x', strlen($value));
        }

        return str_repeat('x', strlen($value) - 4).substr($value, -4);
    }
}
