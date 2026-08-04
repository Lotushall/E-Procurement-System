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
            'id' => $this->id,
            'contactName' => $this->whenNotNull($this->contact_name),
            'contactPosition' => $this->whenNotNull($this->contact_position),
            'contactPhone' => $this->whenNotNull($this->contact_phone),
            'contactEmail' => $this->whenNotNull($this->contact_email),
            'lineId' => $this->whenNotNull($this->line_id),
            'otherContact' => $this->whenNotNull($this->other_contact),
            'isMainContact' => $this->whenNotNull($this->is_main_contact),
        ];
    }
}
