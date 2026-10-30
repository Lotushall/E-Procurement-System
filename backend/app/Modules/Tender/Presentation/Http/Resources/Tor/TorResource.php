<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Tor;

use App\Modules\InternalProfiles\Presentation\Http\Resources\DepartmentResource;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TorResource extends JsonResource
{
    public static $wrap = false;

    /**
     * Every key is always present: a missing value is null, never a dropped
     * key. Relations are read directly because both TOR queries eager-load
     * Tors::RESOURCE_RELATIONS.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'torCode' => $this->tor_code,
            'title' => $this->title,
            'scopeOfWork' => $this->scope_of_work,
            'budgetEstimate' => $this->budget_estimate,
            'procurementMethod' => $this->procurement_method,
            'fiscalYear' => $this->fiscal_year,
            'biddingStartAt' => $this->bidding_start_at?->toIso8601String(),
            'biddingEndAt' => $this->bidding_end_at?->toIso8601String(),
            'status' => $this->status,
            'remark' => $this->remark,
            'approvedAt' => $this->approved_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'department' => DepartmentResource::make($this->TorsDepartment),
            'tenderProject' => $this->TorsTenderProject === null ? null : [
                'id' => $this->TorsTenderProject->id,
                'projectCode' => $this->TorsTenderProject->project_code,
                'name' => $this->TorsTenderProject->name,
            ],
            'createdBy' => $this->userSummary($this->TorsCreatedBy),
            'approvedBy' => $this->userSummary($this->TorsApprovedBy),
        ];
    }

    /**
     * A TOR viewer needs to know who acted, not their account details, so
     * only id, display name and department are exposed.
     *
     * @return array{id: int, name: string|null, department: array{id: int, name: string}|null}|null
     */
    private function userSummary(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        $profile = $user->UserInternalProfile;
        $department = $profile?->InternalProfileDepartment;

        return [
            'id' => $user->id,
            'name' => $profile === null ? null : trim($profile->firstname.' '.$profile->lastname),
            'department' => $department === null ? null : [
                'id' => $department->id,
                'name' => $department->name,
            ],
        ];
    }
}
