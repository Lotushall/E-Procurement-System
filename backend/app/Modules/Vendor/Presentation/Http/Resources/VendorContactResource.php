<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorContactResource extends JsonResource
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
            'contactName' => $this->contact_name,
            'contactPosition' => $this->contact_position,
            'contactPhone' => $this->contact_phone,
            'contactEmail' => $this->contact_email,
            'lineId' => $this->line_id,
            'otherContact' => $this->other_contact,
            'isMainContact' => $this->is_main_contact,
        ];
    }
}
