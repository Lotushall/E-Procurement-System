<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Carbon\CarbonImmutable;

final class CreateTenderProjectUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    public function execute(CreateTenderProjectData $data, int $createdBy): TenderProject
    {
        $sequence = $this->tenderProjects->nextSequenceForFiscalYear($data->fiscalYear);
        $projectCode = ProjectCode::fromString(sprintf('TP-%d-%04d', $data->fiscalYear, $sequence));

        $project = TenderProject::create(
            projectCode: $projectCode,
            name: $data->name,
            description: $data->description,
            budget: Money::fromString($data->budget),
            departmentId: $data->departmentId,
            personInChargeId: $data->personInChargeId,
            createdBy: $createdBy,
            procurementMethod: $data->procurementMethod,
            fiscalYear: $data->fiscalYear,
            projectStartAt: $data->projectStartAt !== null ? CarbonImmutable::parse($data->projectStartAt) : null,
            projectEndAt: $data->projectEndAt !== null ? CarbonImmutable::parse($data->projectEndAt) : null,
        );

        $saved = $this->tenderProjects->save($project);

        app_log('Tender project created', [
            'tender_project_id' => $saved->id(),
            'project_code' => (string) $saved->projectCode(),
        ], 'info', 'tender');

        return $saved;
    }
}
