<?php

namespace App\Modules\User\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Application\Queries\ListUserSessionsQuery;
use App\Modules\User\Application\Queries\ListUsersQuery;
use App\Modules\User\Application\UseCases\RevokeAllUserSessionsUseCase;
use App\Modules\User\Application\UseCases\RevokeUserSessionUseCase;
use App\Modules\User\Presentation\Http\Requests\ListUsersRequest;
use App\Modules\User\Presentation\Http\Resources\SessionResource;
use App\Modules\User\Presentation\Http\Resources\UserDetailResource;
use App\Modules\User\Presentation\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly ListUsersQuery $listUsers,
        private readonly GetUserByIdQuery $getUserById,
        private readonly ListUserSessionsQuery $listUserSessions,
        private readonly RevokeUserSessionUseCase $revokeUserSession,
        private readonly RevokeAllUserSessionsUseCase $revokeAllUserSessions,
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

    public function sessions(int $id): JsonResponse
    {
        return response()->json([
            'data' => SessionResource::collection($this->listUserSessions->execute($id)),
        ]);
    }

    public function revokeSession(int $id, string $sessionId): JsonResponse
    {
        $this->revokeUserSession->execute($id, $sessionId);

        return response()->json(['message' => 'เพิกถอน session สำเร็จ']);
    }

    public function revokeAllSessions(int $id, Request $request): JsonResponse
    {
        $this->revokeAllUserSessions->execute(
            $id,
            $request->boolean('keep_current') ? $request->session()->getId() : null,
        );

        return response()->json(['message' => 'เพิกถอน session สำเร็จ']);
    }
}
