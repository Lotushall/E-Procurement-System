<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorProfileResource extends JsonResource
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
            'verificationStatus' => $this->verification_status->getValue(),
            'verifiedAt' => $this->whenNotNull($this->verified_at?->toIso8601String()),
            'remark' => $this->whenNotNull($this->remark),
            'detail' => $this->VendorProfilesCompanyDetail !== null
                ? new VendorCompanyDetailResource($this->VendorProfilesCompanyDetail)
                : new VendorIndividualDetailResource($this->VendorProfilesIndividualDetail),
            'contact' => $this->whenNotNull(
                $this->VendorProfilesContact !== null ? new VendorContactResource($this->VendorProfilesContact) : null,
            ),
        ];
    }
}
