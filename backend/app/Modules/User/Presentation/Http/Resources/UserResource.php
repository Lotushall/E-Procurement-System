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
            'role' => $this->when(
                $this->relationLoaded('roles'),
                fn () => $this->getRoleNames()->first()
            ),
            'internalProfile' => $this->whenNotNull($this->user_type === UserType::Internal ? [
                'employeeNo' => $this->whenNotNull($this->UserInternalProfile?->employee_no),
                'prefix' => $this->whenNotNull($this->UserInternalProfile?->prefix),
                'firstname' => $this->whenNotNull($this->UserInternalProfile?->firstname),
                'lastname' => $this->whenNotNull($this->UserInternalProfile?->lastname),
                'department' => $this->whenNotNull($this->UserInternalProfile?->department),
                'position' => $this->whenNotNull($this->UserInternalProfile?->position),
                'phone' => $this->whenNotNull($this->UserInternalProfile?->phone),
            ] : null),
            'permissions' => $this->when(
                $this->relationLoaded('permissions'),
                fn () => $this->getAllPermissions()->pluck('name')
            ),
            'emailVerifiedAt' => $this->whenNotNull($this->email_verified_at?->toIso8601String()),
            'lastLoginAt' => $this->whenNotNull($this->last_login_at?->toIso8601String()),
            'passwordChangedAt' => $this->whenNotNull($this->password_changed_at?->toIso8601String()),
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
