<?php

namespace App\Modules\User\Presentation\Http\Resources;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'name' => $this->resolveName(),
            'userType' => $this->user_type->value,
            'status' => $this->status->getValue(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }

    private function resolveName(): ?string
    {
        return match ($this->user_type) {
            UserType::Internal => $this->UserInternalProfile !== null
                ? trim($this->UserInternalProfile->firstname.' '.$this->UserInternalProfile->lastname)
                : null,
            UserType::Company => $this->UserVendorProfile?->VendorProfilesCompanyDetail?->company_name,
            UserType::Individual => $this->UserVendorProfile?->VendorProfilesIndividualDetail?->store_name,
        };
    }
}
