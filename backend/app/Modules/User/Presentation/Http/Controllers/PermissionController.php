<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use App\Modules\User\Application\UseCases\DeletePermissionUseCase;
use App\Modules\User\Application\UseCases\UpdatePermissionUseCase;
use App\Modules\User\Presentation\Http\Requests\StorePermissionRequest;
use App\Modules\User\Presentation\Http\Requests\UpdatePermissionRequest;
use App\Modules\User\Presentation\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
        private readonly CreatePermissionUseCase $createPermission,
        private readonly UpdatePermissionUseCase $updatePermission,
        private readonly DeletePermissionUseCase $deletePermission,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPermissions->execute(),
        ]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->createPermission->execute(PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)], 201);
    }

    public function update(UpdatePermissionRequest $request, string $name): JsonResponse
    {
        $permission = $this->updatePermission->execute($name, PermissionData::from($request->validated()));

        return response()->json(['data' => new PermissionResource($permission)]);
    }

    public function destroy(string $name): JsonResponse
    {
        $this->deletePermission->execute($name);

        return response()->json(null, 204);
    }
}
