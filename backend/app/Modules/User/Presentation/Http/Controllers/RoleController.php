<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\ListRolesQuery;
use App\Modules\User\Presentation\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function __construct(
        private readonly ListRolesQuery $listRoles,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleResource::collection($this->listRoles->execute()),
        ]);
    }
}
