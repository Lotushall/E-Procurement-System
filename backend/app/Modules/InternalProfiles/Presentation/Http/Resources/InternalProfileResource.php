<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InternalProfileResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->whenNotNull($this->user_id),
            'employeeNo' => $this->whenNotNull($this->employee_no),
            'prefix' => $this->whenNotNull($this->prefix),
            'firstname' => $this->whenNotNull($this->firstname),
            'lastname' => $this->whenNotNull($this->lastname),
            'department' => DepartmentResource::make($this->whenLoaded('InternalProfileDepartment')),
            'position' => PositionResource::make($this->whenLoaded('InternalProfilePosition')),
            'phone' => $this->whenNotNull($this->phone),
        ];
    }
}
