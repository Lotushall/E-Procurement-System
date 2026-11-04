<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;

final class DeleteTenderProjectUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    /**
     * Without $ignoresStatusLock a finished project (TenderProject::isEditable())
     * may not be deleted.
     *
     * @return string|null an error message if the deletion was rejected, null on success
     */
    public function execute(int $id, bool $ignoresStatusLock): ?string
    {
        $project = $this->tenderProjects->findById($id);

        if (! $ignoresStatusLock && ! $project->isEditable()) {
            return 'ไม่สามารถลบโครงการได้ เนื่องจากโครงการเสร็จสิ้น ยกเลิก หรือเก็บถาวรแล้ว';
        }

        $this->tenderProjects->delete($id);

        app_log('Tender project deleted', [
            'tender_project_id' => $id,
            'ignores_status_lock' => $ignoresStatusLock,
        ], 'info', 'tender');

        return null;
    }
}
