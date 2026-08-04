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
            'storeName' => $this->whenNotNull($this->store_name),
            'prefix' => $this->whenNotNull($this->prefix),
            'firstname' => $this->whenNotNull($this->firstname),
            'lastname' => $this->whenNotNull($this->lastname),
            'citizenId' => $this->whenNotNull(self::maskSensitiveId($this->citizen_id)),
            'businessType' => $this->whenNotNull($this->business_type),
            'taxId' => $this->whenNotNull(self::maskSensitiveId($this->tax_id)),
            'email' => $this->whenNotNull($this->email),
            'phone' => $this->whenNotNull($this->phone),
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
