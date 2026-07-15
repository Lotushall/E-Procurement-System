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
            'detail' => $this->detailData(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailData(): array
    {
        if ($this->VendorProfilesCompanyDetail !== null) {
            $detail = $this->VendorProfilesCompanyDetail;

            return [
                'type' => 'company',
                'companyName' => $detail->company_name,
                'businessRegistrationNo' => $detail->business_registration_no,
                'branchNo' => $detail->branch_no,
                'businessType' => $detail->business_type,
                'address' => $detail->address,
                'country' => $detail->country,
                'province' => $detail->province,
                'postalCode' => $detail->postal_code,
            ];
        }

        $detail = $this->VendorProfilesIndividualDetail;

        return [
            'type' => 'individual',
            'storeName' => $detail->store_name,
            'prefix' => $detail->prefix,
            'firstname' => $detail->firstname,
            'lastname' => $detail->lastname,
            'businessType' => $detail->business_type,
            'email' => $detail->email,
            'phone' => $detail->phone,
            'address' => $detail->address,
            'country' => $detail->country,
            'province' => $detail->province,
            'postalCode' => $detail->postal_code,
        ];
    }
}
