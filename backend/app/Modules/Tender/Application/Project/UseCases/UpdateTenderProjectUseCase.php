<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Application\Project\DTOs\UpdateTenderProjectData;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Carbon\CarbonImmutable;

final class UpdateTenderProjectUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    /**
     * Replace every editable field of the project. The project code is kept
     * as long as the fiscal year stays the same; moving the project to another
     * fiscal year issues the next code in that year's sequence.
     */
    public function execute(int $id, UpdateTenderProjectData $data): TenderProject
    {
        $project = $this->tenderProjects->findById($id);
        $previousProjectCode = (string) $project->projectCode();

        $project->update(
            projectCode: $this->resolveProjectCode($project, $data->fiscalYear),
            name: $data->name,
            description: $data->description,
            budget: Money::fromString($data->budget),
            departmentId: $data->departmentId,
            personInChargeId: $data->personInChargeId,
            procurementMethod: $data->procurementMethod,
            fiscalYear: $data->fiscalYear,
            projectStartAt: $data->projectStartAt !== null ? CarbonImmutable::parse($data->projectStartAt) : null,
            projectEndAt: $data->projectEndAt !== null ? CarbonImmutable::parse($data->projectEndAt) : null,
        );

        $saved = $this->tenderProjects->save($project);

        app_log('Tender project updated', [
            'tender_project_id' => $saved->id(),
            'project_code' => (string) $saved->projectCode(),
            'previous_project_code' => $previousProjectCode,
        ], 'info', 'tender');

        return $saved;
    }

    private function resolveProjectCode(TenderProject $project, int $fiscalYear): ProjectCode
    {
        if ($project->fiscalYear() === $fiscalYear) {
            return $project->projectCode();
        }

        $sequence = $this->tenderProjects->nextSequenceForFiscalYear($fiscalYear);

        return ProjectCode::fromString(sprintf('TP-%d-%04d', $fiscalYear, $sequence));
    }
}
