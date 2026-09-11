<?php

namespace App\Modules\Tender\Infrastructure\Repositories\Project;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class TenderProjectRepository implements TenderProjectRepositoryInterface
{
    public function nextSequenceForFiscalYear(int $fiscalYear): int
    {
        return DB::transaction(function () use ($fiscalYear) {
            $prefix = "TP-{$fiscalYear}-";

            $lastCode = TenderProjects::where('project_code', 'like', "{$prefix}%")
                ->lockForUpdate()
                ->orderByDesc('project_code')
                ->value('project_code');

            if ($lastCode === null) {
                return 1;
            }

            return ((int) substr($lastCode, strlen($prefix))) + 1;
        });
    }

    public function findById(int $id): TenderProject
    {
        return $this->mapToEntity(TenderProjects::findOrFail($id));
    }

    public function save(TenderProject $project): TenderProject
    {
        $model = $project->id() !== null
            ? TenderProjects::findOrFail($project->id())
            : new TenderProjects;

        $model->project_code = (string) $project->projectCode();
        $model->name = $project->name();
        $model->description = $project->description();
        $model->budget = $project->budget()->amount;
        $model->department_id = $project->departmentId();
        $model->person_in_charge_id = $project->personInChargeId();
        $model->created_by = $project->createdBy();
        $model->procurement_method = $project->procurementMethod();
        $model->fiscal_year = $project->fiscalYear();
        $model->project_start_at = $project->projectStartAt();
        $model->project_end_at = $project->projectEndAt();
        $model->status = $project->status();
        $model->save();

        return $this->mapToEntity($model);
    }

    public function delete(int $id): void
    {
        TenderProjects::findOrFail($id)->delete();
    }

    private function mapToEntity(TenderProjects $model): TenderProject
    {
        return TenderProject::reconstitute(
            id: $model->id,
            projectCode: ProjectCode::fromString($model->project_code),
            name: $model->name,
            description: $model->description,
            budget: Money::fromString($model->budget),
            departmentId: $model->department_id,
            personInChargeId: $model->person_in_charge_id,
            createdBy: $model->created_by,
            procurementMethod: $model->procurement_method,
            fiscalYear: $model->fiscal_year,
            projectStartAt: $model->project_start_at !== null ? CarbonImmutable::instance($model->project_start_at) : null,
            projectEndAt: $model->project_end_at !== null ? CarbonImmutable::instance($model->project_end_at) : null,
            status: $model->status,
        );
    }
}
