<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Project;

use App\Modules\InternalProfiles\Presentation\Http\Resources\DepartmentResource;
use App\Modules\InternalProfiles\Presentation\Http\Resources\InternalProfileResource;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenderProjectResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'projectCode' => $this->whenNotNull($this->project_code),
            'name' => $this->whenNotNull($this->name),
            'description' => $this->whenNotNull($this->description),
            'budget' => $this->whenNotNull($this->budget),
            'department' =>  DepartmentResource::make($this->whenLoaded('TenderProjectsDepartment')),
            'personInCharge' => InternalProfileResource::make($this->whenLoaded('TenderProjectsPersonInCharge')),
            'createdBy' => UserResource::make($this->whenLoaded('TenderProjectsCreatedBy')),
            'procurementMethod' => $this->whenNotNull($this->procurement_method),
            'fiscalYear' => $this->whenNotNull($this->fiscal_year),
            'projectStartAt' => $this->whenNotNull($this->project_start_at),
            'projectEndAt' => $this->whenNotNull($this->project_end_at),
            'status' => $this->whenNotNull($this->status),
        ];
    }
}
