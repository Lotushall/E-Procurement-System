<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;

final class UpdateTenderProjectStatusUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    /**
     * Any status may move directly to any other status; only re-applying the
     * project's current status is rejected.
     *
     * @return string|null an error message if the change was rejected, null on success
     */
    public function execute(int $id, string $status, int $actingUserId): ?string
    {
        $project = $this->tenderProjects->findById($id);
        $previousStatus = $project->status();

        if ($previousStatus === $status) {
            return 'ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากโครงการอยู่ในสถานะนี้อยู่แล้ว';
        }

        $project->changeStatus($status);
        $this->tenderProjects->save($project);

        app_log('Tender project status changed', [
            'tender_project_id' => $id,
            'previous_status' => $previousStatus,
            'status' => $status,
            'acting_user_id' => $actingUserId,
        ], 'info', 'tender');

        return null;
    }
}
