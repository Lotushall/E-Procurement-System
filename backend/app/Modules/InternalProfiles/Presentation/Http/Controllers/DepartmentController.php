<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\InternalProfiles\Application\DTOs\DepartmentData;
use App\Modules\InternalProfiles\Application\Queries\ListDepartmentsQuery;
use App\Modules\InternalProfiles\Application\UseCases\CreateDepartmentUseCase;
use App\Modules\InternalProfiles\Application\UseCases\DeleteDepartmentUseCase;
use App\Modules\InternalProfiles\Application\UseCases\UpdateDepartmentUseCase;
use App\Modules\InternalProfiles\Presentation\Http\Requests\StoreDepartmentRequest;
use App\Modules\InternalProfiles\Presentation\Http\Requests\UpdateDepartmentRequest;
use App\Modules\InternalProfiles\Presentation\Http\Resources\DepartmentResource;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function __construct(
        private readonly ListDepartmentsQuery $listDepartments,
        private readonly CreateDepartmentUseCase $createDepartment,
        private readonly UpdateDepartmentUseCase $updateDepartment,
        private readonly DeleteDepartmentUseCase $deleteDepartment,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DepartmentResource::collection($this->listDepartments->execute()),
        ]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = $this->createDepartment->execute(DepartmentData::from($request->validated()));

        return response()->json(['data' => new DepartmentResource($department)], 201);
    }

    public function update(UpdateDepartmentRequest $request, int $id): JsonResponse
    {
        $department = $this->updateDepartment->execute($id, DepartmentData::from($request->validated()));

        return response()->json(['data' => new DepartmentResource($department)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $message = $this->deleteDepartment->execute($id);

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }
}
