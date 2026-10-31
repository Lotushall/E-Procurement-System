<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Project;

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\InternalProfiles\Presentation\Http\Resources\DepartmentResource;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Database\Eloquent\Collection;
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
            'department' => DepartmentResource::make($this->whenLoaded('TenderProjectsDepartment')),
            'personInCharge' => $this->whenLoaded('TenderProjectsPersonInCharge', fn (InternalProfiles $profile) => [
                'id' => $profile->id,
                'firstname' => $profile->firstname,
                'lastname' => $profile->lastname,
            ]),
            'procurementMethod' => $this->whenNotNull($this->procurement_method),
            'fiscalYear' => $this->whenNotNull($this->fiscal_year),
            'projectStartAt' => $this->whenNotNull($this->project_start_at),
            'projectEndAt' => $this->whenNotNull($this->project_end_at),
            'status' => $this->whenNotNull($this->status),
            'torsCount' => $this->whenCounted('tors'),
            'tors' => $this->whenLoaded('TenderProjectsTors', fn (Collection $tors) => $tors->map(fn (Tors $tor) => [
                'id' => $tor->id,
                'torCode' => $tor->tor_code,
                'title' => $tor->title,
                'procurementMethod' => $tor->procurement_method,
                'budgetEstimate' => $tor->budget_estimate,
                'biddingEndAt' => $tor->bidding_end_at?->toIso8601String(),
                'status' => $tor->status,
            ])),
        ];
    }
}
