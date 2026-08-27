<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\InternalProfiles\Application\DTOs\CreateInternalProfileData;
use App\Modules\InternalProfiles\Application\DTOs\UpdateInternalProfileData;
use App\Modules\InternalProfiles\Application\Queries\GetInternalProfileByIdQuery;
use App\Modules\InternalProfiles\Application\Queries\ListAvailableInternalProfilesQuery;
use App\Modules\InternalProfiles\Application\Queries\ListIneternalProfilesQuery;
use App\Modules\InternalProfiles\Application\UseCases\CreateInternalProfileUseCase;
use App\Modules\InternalProfiles\Application\UseCases\DeleteInternalProfileUseCase;
use App\Modules\InternalProfiles\Application\UseCases\UpdateInternalProfileUseCase;
use App\Modules\InternalProfiles\Presentation\Http\Requests\ListInternalProfilesRequest;
use App\Modules\InternalProfiles\Presentation\Http\Requests\StoreInternalProfileRequest;
use App\Modules\InternalProfiles\Presentation\Http\Requests\UpdateInternalProfileRequest;
use App\Modules\InternalProfiles\Presentation\Http\Resources\InternalProfileResource;
use Illuminate\Http\JsonResponse;

class InternalProfilesController extends Controller
{
    public function __construct(
        private readonly ListIneternalProfilesQuery $listIneternalProfilesQuery,
        private readonly ListAvailableInternalProfilesQuery $listAvailableInternalProfiles,
        private readonly GetInternalProfileByIdQuery $getInternalProfileById,
        private readonly CreateInternalProfileUseCase $createInternalProfile,
        private readonly UpdateInternalProfileUseCase $updateInternalProfile,
        private readonly DeleteInternalProfileUseCase $deleteInternalProfile,
    ) {}

    public function selectAvailable(): JsonResponse
    {
        return response()->json([
            'data' => $this->listAvailableInternalProfiles->execute(),
        ]);
    }

    public function index(ListInternalProfilesRequest $request)
    {
        $internal_profiles = $this->listIneternalProfilesQuery->execute(
            search: $request->validated('search'),
            departmentId: $request->validated('department_id'),
            positionId: $request->validated('position_id'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => InternalProfileResource::collection($internal_profiles->getCollection()),
            'meta' => [
                'currentPage' => $internal_profiles->currentPage(),
                'lastPage' => $internal_profiles->lastPage(),
                'perPage' => $internal_profiles->perPage(),
                'total' => $internal_profiles->total(),
            ],
        ]);
    }

    public function store(StoreInternalProfileRequest $request): JsonResponse
    {
        $profile = $this->createInternalProfile->execute(CreateInternalProfileData::from($request->validated()));

        return response()->json([
            'data' => new InternalProfileResource($this->getInternalProfileById->execute($profile->id())),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => new InternalProfileResource($this->getInternalProfileById->execute($id)),
        ]);
    }

    public function update(UpdateInternalProfileRequest $request, int $id): JsonResponse
    {
        $profile = $this->updateInternalProfile->execute($id, UpdateInternalProfileData::from($request->validated()));

        return response()->json([
            'data' => new InternalProfileResource($this->getInternalProfileById->execute($profile->id())),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->deleteInternalProfile->execute($id);

        return response()->json(null, 204);
    }
}
