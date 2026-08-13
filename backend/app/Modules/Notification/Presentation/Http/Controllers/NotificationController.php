<?php

namespace App\Modules\Notification\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery;
use App\Modules\Notification\Application\Queries\ListNotificationsQuery;
use App\Modules\Notification\Presentation\Http\Requests\ListNotificationsRequest;
use App\Modules\Notification\Presentation\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private readonly ListNotificationsQuery $listNotifications,
        private readonly CountUnreadNotificationsQuery $countUnreadNotifications,
    ) {}

    public function index(ListNotificationsRequest $request): JsonResponse
    {
        $notifications = $this->listNotifications->execute(
            userId: $request->user()->id,
            status: $request->validated('status'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => NotificationResource::collection($notifications->getCollection()),
            'meta' => [
                'currentPage' => $notifications->currentPage(),
                'lastPage' => $notifications->lastPage(),
                'perPage' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'data' => ['count' => $this->countUnreadNotifications->execute($request->user()->id)],
        ]);
    }
}
