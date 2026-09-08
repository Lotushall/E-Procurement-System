<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;

final class DeleteTenderProjectUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    public function execute(int $id): void
    {
        $this->tenderProjects->delete($id);

        app_log('Tender project deleted', [
            'tender_project_id' => $id,
        ], 'info', 'tender');
    }
}
