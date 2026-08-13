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
            'documentStatusCounts' => $this->when(
                isset($this->approved_documents_count),
                fn () => [
                    'approved' => (int) $this->approved_documents_count,
                    'pending' => (int) $this->pending_documents_count,
                    'rejected' => (int) $this->rejected_documents_count,
                ],
            ),
            'detail' => $companyDetail !== null
                ? new VendorCompanyDetailResource($companyDetail)
                : new VendorIndividualDetailResource($individualDetail),
            'contact' => $this->whenLoaded('VendorProfilesContact', fn () => VendorContactResource::collection($this->VendorProfilesContact)),
            'document' => $this->whenLoaded('VendorProfilesDocuments', fn () => VendorDocumentResource::collection($this->VendorProfilesDocuments)),
            'user' => $this->whenLoaded('VendorProfilesUser', fn () => [
                'id' => $this->VendorProfilesUser->id,
                'username' => $this->VendorProfilesUser->username,
                'email' => $this->VendorProfilesUser->email,
            ]),
            'created_at' => $this->whenNotNull($this->created_at?->toIso8601String()),
            'updated_at' => $this->whenNotNull($this->updated_at?->toIso8601String()),
        ];
    }
}
