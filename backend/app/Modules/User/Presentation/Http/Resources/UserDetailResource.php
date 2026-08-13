<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Illuminate\Http\Request;

class UserDetailResource extends UserResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'vendorProfileId' => $this->UserVendorProfile?->id,
        ];
    }
}
