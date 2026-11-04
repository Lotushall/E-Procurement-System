<?php

namespace App\Modules\Tender\Application\Project\UseCases;

use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;

final class UpdateTenderProjectStatusUseCase
{
    public function __construct(
        private readonly TenderProjectRepositoryInterface $tenderProjects,
    ) {}

    /**
     * Without $ignoresStatusLock the project may only move one step forward
     * (TenderProject::canMoveForwardTo()); with it, any status may move to any
     * other. Either way, re-applying the project's current status is rejected.
     *
     * @return string|null an error message if the change was rejected, null on success
     */
    public function execute(int $id, string $status, int $actingUserId, bool $ignoresStatusLock): ?string
    {
        $project = $this->tenderProjects->findById($id);
        $previousStatus = $project->status();

        if ($previousStatus === $status) {
            return 'ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากโครงการอยู่ในสถานะนี้อยู่แล้ว';
        }

        if (! $ignoresStatusLock && ! $project->canMoveForwardTo($status)) {
            return 'ไม่สามารถเปลี่ยนเป็นสถานะนี้ได้ โครงการต้องเปลี่ยนสถานะไปทีละขั้นตามลำดับ';
        }

        $project->changeStatus($status);
        $this->tenderProjects->save($project);

        app_log('Tender project status changed', [
            'tender_project_id' => $id,
            'previous_status' => $previousStatus,
            'status' => $status,
            'acting_user_id' => $actingUserId,
            'ignores_status_lock' => $ignoresStatusLock,
        ], 'info', 'tender');

        return null;
    }
}
