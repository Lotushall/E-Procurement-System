<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorSummaryResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isCompany = $this->VendorProfilesCompanyDetail !== null;

        return [
            'id' => $this->id,
            'displayName' => $this->VendorProfilesCompanyDetail?->company_name
                ?? $this->VendorProfilesIndividualDetail?->store_name
                ?? '',
            'vendorType' => $isCompany ? 'company' : 'individual',
            'verificationStatus' => $this->verification_status->getValue(),
            'submittedAt' => $this->created_at->toIso8601String(),
        ];
    }
}
