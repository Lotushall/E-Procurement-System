<?php

namespace App\Modules\User\Presentation\Http\Resources;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedUserResource extends JsonResource
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
            'username' => $this->whenNotNull($this->username),
            'email' => $this->whenNotNull($this->email),
            'userType' => $this->whenNotNull($this->user_type->value),
            'emailVerifiedAt' => $this->email_verified_at,
            'profiles' => $this->whenNotNull($this->profileData()),
            'roles' => $this->whenNotNull($this->getRoleNames()),
            'permissions' => $this->whenNotNull($this->getAllPermissions()->pluck('name')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function profileData(): array
    {
        $profile = match ($this->user_type) {
            UserType::Internal => $this->UserInternalProfile,
            UserType::Company => $this->UserVendorProfile?->VendorProfilesCompanyDetail,
            UserType::Individual => $this->UserVendorProfile?->VendorProfilesIndividualDetail,
        };

        return [
            'companyName' => $profile->company_name ?? null,
            'shopName' => $profile->store_name ?? null,
            'firstname' => $profile->firstname ?? null,
            'lastname' => $profile->lastname ?? null,
        ];
    }
}
