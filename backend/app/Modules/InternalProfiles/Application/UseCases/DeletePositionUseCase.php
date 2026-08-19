<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Domain\Repositories\PositionRepositoryInterface;

final class DeletePositionUseCase
{
    public function __construct(
        private readonly PositionRepositoryInterface $positions,
    ) {}

    /**
     * @return string|null an error message if the delete was blocked, null on success
     */
    public function execute(int $id): ?string
    {
        $position = $this->positions->findOrFail($id);

        if ($position->internal_profiles_count > 0) {
            return 'ไม่สามารถลบตำแหน่งที่ยังมีผู้ใช้งานอยู่ได้';
        }

        $this->positions->delete($id);

        app_log('Position deleted', [
            'position_id' => $position->id,
            'name' => $position->name,
        ], 'info', 'user');

        return null;
    }
}
