<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\DTOs\RoleData;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Application\UseCases\CreateRoleUseCase;
use App\Modules\User\Presentation\Http\Requests\StoreRoleRequest;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
        private readonly CreateRoleUseCase $createRole,
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
}
