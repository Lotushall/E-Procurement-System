<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PositionResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->whenNotNull($this->id),
            'name' => $this->whenNotNull($this->name),
            'internalProfilesCount' => $this->whenNotNull($this->internal_profiles_count),
        ];
    }
}
