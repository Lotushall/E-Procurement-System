<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Presentation\Http\Requests\ListUsersRequest;
use App\Modules\User\Presentation\Http\Resources\UserDetailResource;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly ListUsersQuery $listUsers,
        private readonly GetUserByIdQuery $getUserById,
    ) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $users = $this->listUsers->execute(
            type: $request->validated('type'),
            status: $request->validated('status'),
            search: $request->validated('search'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => UserResource::collection($users->getCollection()),
            'meta' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => new UserDetailResource($this->getUserById->execute($id)),
        ]);
    }
}
