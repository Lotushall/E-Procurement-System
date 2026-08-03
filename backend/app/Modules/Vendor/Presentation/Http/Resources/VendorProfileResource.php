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
        $companyDetail = $this->VendorProfilesCompanyDetail;
        $individualDetail = $this->VendorProfilesIndividualDetail;

        return [
            'id' => $this->id,
            'verificationStatus' => $this->whenNotNull($this->verification_status?->getValue()),
            'verifiedAt' => $this->whenNotNull($this->verified_at?->toIso8601String()),
            'remark' => $this->whenNotNull($this->remark),
            'detail' => $companyDetail !== null
                ? new VendorCompanyDetailResource($companyDetail)
                : new VendorIndividualDetailResource($individualDetail),
            'contact' => $this->whenLoaded('VendorProfilesContact', fn () => VendorContactResource::collection($this->VendorProfilesContact)),
            'document' => $this->whenLoaded('VendorProfilesDocuments', fn () => VendorDocumentResource::collection($this->VendorProfilesDocuments)),
            'created_at' => $this->whenNotNull($this->created_at?->toIso8601String()),
            'updated_at' => $this->whenNotNull($this->updated_at?->toIso8601String()),
        ];
    }
}
