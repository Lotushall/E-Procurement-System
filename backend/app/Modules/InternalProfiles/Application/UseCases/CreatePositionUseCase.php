<?php

namespace App\Modules\InternalProfiles\Application\UseCases;

use App\Modules\InternalProfiles\Application\DTOs\PositionData;
use App\Modules\InternalProfiles\Domain\Repositories\PositionRepositoryInterface;
use App\Modules\InternalProfiles\Infrastructure\Models\Position;

final class CreatePositionUseCase
{
    public function __construct(
        private readonly PositionRepositoryInterface $positions,
    ) {}

    public function execute(PositionData $data): Position
    {
        $position = $this->positions->create($data->name);

        app_log('Position created', [
            'position_id' => $position->id,
            'name' => $position->name,
        ], 'info', 'user');

        return $position;
    }
}
