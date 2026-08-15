<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\ListPermissionsQuery;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(
        private readonly ListPermissionsQuery $listPermissions,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->listPermissions->execute(),
        ]);
    }
}
