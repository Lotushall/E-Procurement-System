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
            'companyName' => $this->whenNotNull($this->company_name),
            'businessRegistrationNo' => $this->whenNotNull(self::maskSensitiveId($this->business_registration_no)),
            'taxId' => $this->whenNotNull(self::maskSensitiveId($this->tax_id)),
            'branchNo' => $this->whenNotNull($this->branch_no),
            'businessType' => $this->whenNotNull($this->business_type),
            'address' => $this->whenNotNull($this->address),
            'country' => $this->whenNotNull($this->country),
            'province' => $this->whenNotNull($this->province),
            'postalCode' => $this->whenNotNull($this->postal_code),
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
