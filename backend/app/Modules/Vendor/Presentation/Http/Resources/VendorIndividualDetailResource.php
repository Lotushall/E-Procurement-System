<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorIndividualDetailResource extends JsonResource
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
            'type' => 'individual',
            'storeName' => $this->store_name,
            'prefix' => $this->prefix,
            'firstname' => $this->firstname,
            'lastname' => $this->lastname,
            'citizenId' => self::maskSensitiveId($this->citizen_id),
            'businessType' => $this->business_type,
            'taxId' => self::maskSensitiveId($this->tax_id),
            'email' => $this->email,
            'phone' => $this->phone,
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
