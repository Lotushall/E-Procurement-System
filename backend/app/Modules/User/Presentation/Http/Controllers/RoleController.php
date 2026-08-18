<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Application\UseCases\DeleteRoleUseCase;
use App\Modules\User\Application\UseCases\UpdateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Requests\UpdateRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
        private readonly UpdateRoleUseCase $updateRole,
        private readonly DeleteRoleUseCase $deleteRole,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->createRole->execute(RoleData::from($request->validated()));

        return response()->json(['data' => new RoleResource($role)], 201);
    }

    public function update(UpdateRoleRequest $request, int $id): JsonResponse
    {
        $result = $this->updateRole->execute($id, RoleData::from($request->validated()));

        if (is_string($result)) {
            return response()->json(['message' => $result], 422);
        }

        return response()->json(['data' => new RoleResource($result)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $message = $this->deleteRole->execute($id);

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }
}
