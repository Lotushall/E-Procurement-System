<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Project;

use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
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
        return $this->resource instanceof TenderProjects
            ? $this->fromModel($this->resource)
            : $this->fromEntity($this->resource);
    }

    /**
     * @return array<string, mixed>
     */
    private function fromEntity(TenderProject $project): array
    {
        return [
            'id' => $project->id(),
            'projectCode' => $project->projectCode()->value,
            'name' => $project->name(),
            'description' => $this->whenNotNull($project->description()),
            'budget' => $project->budget()->amount,
            'departmentId' => $project->departmentId(),
            'personInChargeId' => $this->whenNotNull($project->personInChargeId()),
            'createdBy' => $project->createdBy(),
            'procurementMethod' => $project->procurementMethod(),
            'fiscalYear' => $project->fiscalYear(),
            'projectStartAt' => $this->whenNotNull($project->projectStartAt()?->toIso8601String()),
            'projectEndAt' => $this->whenNotNull($project->projectEndAt()?->toIso8601String()),
            'status' => $project->status(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fromModel(TenderProjects $model): array
    {
        return [
            'id' => $model->id,
            'projectCode' => $model->project_code,
            'name' => $model->name,
            'description' => $this->whenNotNull($model->description),
            'budget' => $model->budget,
            'departmentId' => $model->department_id,
            'personInChargeId' => $this->whenNotNull($model->person_in_charge_id),
            'createdBy' => $model->created_by,
            'procurementMethod' => $model->procurement_method,
            'fiscalYear' => $model->fiscal_year,
            'projectStartAt' => $this->whenNotNull($model->project_start_at?->toIso8601String()),
            'projectEndAt' => $this->whenNotNull($model->project_end_at?->toIso8601String()),
            'status' => $model->status,
        ];
    }
}
