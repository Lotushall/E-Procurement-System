<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Application\DTOs\PositionData;
use App\Modules\InternalProfiles\Domain\Repositories\PositionRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;

final class UpdatePositionUseCase
{
    public function __construct(
        private readonly PositionRepositoryInterface $positions,
    ) {}

    public function execute(int $id, PositionData $data): Position
    {
        $position = $this->positions->update($id, $data->name);

        app_log('Position updated', [
            'position_id' => $position->id,
            'name' => $position->name,
        ], 'info', 'user');

        return $position;
    }
}
