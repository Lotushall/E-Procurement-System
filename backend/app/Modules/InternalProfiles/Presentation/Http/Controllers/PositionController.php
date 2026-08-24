<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\InternalProfiles\Application\DTOs\PositionData;
use App\Modules\InternalProfiles\Application\Queries\ListPositionOptionsQuery;
use App\Modules\InternalProfiles\Application\Queries\ListPositionsQuery;
use App\Modules\InternalProfiles\Application\UseCases\CreatePositionUseCase;
use App\Modules\InternalProfiles\Application\UseCases\DeletePositionUseCase;
use App\Modules\InternalProfiles\Application\UseCases\UpdatePositionUseCase;
use App\Modules\InternalProfiles\Presentation\Http\Requests\StorePositionRequest;
use App\Modules\InternalProfiles\Presentation\Http\Requests\UpdatePositionRequest;
use App\Modules\InternalProfiles\Presentation\Http\Resources\PositionResource;
use Illuminate\Http\JsonResponse;

class PositionController extends Controller
{
    public function __construct(
        private readonly ListPositionsQuery $listPositions,
        private readonly ListPositionOptionsQuery $listPositionOptions,
        private readonly CreatePositionUseCase $createPosition,
        private readonly UpdatePositionUseCase $updatePosition,
        private readonly DeletePositionUseCase $deletePosition,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => PositionResource::collection($this->listPositions->execute()),
        ]);
    }

    public function select(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPositionOptions->execute(),
        ]);
    }

    public function store(StorePositionRequest $request): JsonResponse
    {
        $position = $this->createPosition->execute(PositionData::from($request->validated()));

        return response()->json(['data' => new PositionResource($position)], 201);
    }

    public function update(UpdatePositionRequest $request, int $id): JsonResponse
    {
        $position = $this->updatePosition->execute($id, PositionData::from($request->validated()));

        return response()->json(['data' => new PositionResource($position)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $message = $this->deletePosition->execute($id);

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }
}
