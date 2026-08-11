# Notification read-side API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-side REST API to `App\Modules\Notification` — list notifications, unread count, mark one/all as read — matching the exact contract a sibling frontend session already implemented against (`frontend/lib/notification/api.ts`, `frontend/docs/superpowers/specs/2026-08-11-notification-center-design.md`).

**Architecture:** New `Application` layer (2 Queries + 2 UseCases) operates on the `User` model's existing `Notifiable` trait relations (`notifications()`/`unreadNotifications()`) — no new repository abstraction. New `Presentation` layer (Controller + FormRequest + Resource) exposes 4 endpoints under `/api/v1/notifications`, mounted in the existing `auth` middleware group alongside vendor routes.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4, Laravel's built-in database notifications (`Illuminate\Notifications\DatabaseNotification`, `Notifiable` trait already on `User`).

## Global Constraints

- Every endpoint requires authentication (`auth` middleware) — unauthenticated requests get 401.
- Every endpoint is scoped to the logged-in user's own notifications only. Mark-as-read on a notification belonging to another user returns 404 (not 403) — achieved by scoping the lookup through `$user->notifications()`, never a global `DatabaseNotification::find()`.
- **Response shapes are a fixed external contract already consumed by frontend code — copy them exactly, do not "improve" or Laravel-default them:**
  - `GET /notifications` → `{ "data": [{ "id", "type", "message", "readAt", "createdAt" }], "meta": { "currentPage", "lastPage", "perPage", "total" } }` — `meta` keys are **camelCase**, item fields are **flat** (no nested `data` object), `readAt`/`createdAt` are **camelCase**. Do NOT use Laravel's default paginated-resource auto-response (it produces snake_case `current_page` etc. plus a `links` key) — build the response array explicitly in the controller.
  - `GET /notifications/unread-count` → `{ "data": { "count": n } }` — wrapped one level deeper than you'd expect.
  - `PATCH /notifications/{id}/read` → **204 No Content**, no body.
  - `PATCH /notifications/read-all` → **204 No Content**, no body.
  - These are `PATCH`, not `POST`.
- List endpoint: page-based pagination (`?page=&per_page=`), default `per_page` 20, max 100.
- List endpoint: optional `?status=unread|read` filter. No other status values are valid.
- No delete/dismiss endpoint. No single-notification "show" endpoint. No frontend work (already done in a separate session). No changes to `NotificationServiceProvider` (nothing new needs binding).
- All Application-layer methods take `int $userId` (not a `User` instance), matching `GetVendorProfileQuery::execute(int $userId)`.

---

### Task 1: Application layer — list, count, mark-as-read, mark-all-as-read

**Files:**
- Create: `app/Modules/Notification/Application/Queries/ListNotificationsQuery.php`
- Create: `app/Modules/Notification/Application/Queries/CountUnreadNotificationsQuery.php`
- Create: `app/Modules/Notification/Application/UseCases/MarkNotificationAsReadUseCase.php`
- Create: `app/Modules/Notification/Application/UseCases/MarkAllNotificationsAsReadUseCase.php`
- Test: `tests/Feature/Modules/Notification/ListNotificationsQueryTest.php`
- Test: `tests/Feature/Modules/Notification/CountUnreadNotificationsQueryTest.php`
- Test: `tests/Feature/Modules/Notification/MarkNotificationAsReadUseCaseTest.php`
- Test: `tests/Feature/Modules/Notification/MarkAllNotificationsAsReadUseCaseTest.php`

**Interfaces:**
- Consumes: `App\Modules\User\Infrastructure\Models\User` (existing, has `Notifiable` trait → `notifications()`, `unreadNotifications()` relations).
- Produces (consumed directly by Task 2's controller):
  - `ListNotificationsQuery::execute(int $userId, ?string $status = null, ?int $page = null, ?int $perPage = null): Illuminate\Pagination\LengthAwarePaginator`
  - `CountUnreadNotificationsQuery::execute(int $userId): int`
  - `MarkNotificationAsReadUseCase::execute(int $userId, string $notificationId): void`
  - `MarkAllNotificationsAsReadUseCase::execute(int $userId): void`

- [ ] **Step 1: Write the failing tests for `ListNotificationsQuery`**

Create `tests/Feature/Modules/Notification/ListNotificationsQueryTest.php`:

```php
<?php

use App\Modules\Notification\Application\Queries\ListNotificationsQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function listNotificationsQuery(): ListNotificationsQuery
{
    return app(ListNotificationsQuery::class);
}

function fakeNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('execute returns only notifications belonging to the given user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $user->notify(fakeNotification());
    $otherUser->notify(fakeNotification());

    $result = listNotificationsQuery()->execute($user->id);

    expect($result->total())->toBe(1);
});

test('execute filters by unread status', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotification());
    $user->notify(fakeNotification());
    $user->notifications()->first()->markAsRead();

    $result = listNotificationsQuery()->execute($user->id, status: 'unread');

    expect($result->total())->toBe(1);
});

test('execute filters by read status', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotification());
    $user->notify(fakeNotification());
    $user->notifications()->first()->markAsRead();

    $result = listNotificationsQuery()->execute($user->id, status: 'read');

    expect($result->total())->toBe(1);
});

test('execute paginates results', function () {
    $user = User::factory()->create();
    collect(range(1, 25))->each(fn () => $user->notify(fakeNotification()));

    $result = listNotificationsQuery()->execute($user->id, page: 2, perPage: 10);

    expect($result->count())->toBe(10)
        ->and($result->currentPage())->toBe(2)
        ->and($result->total())->toBe(25);
});

test('execute orders notifications newest first', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotification());
    $older = $user->notifications()->sole();
    $older->forceFill(['created_at' => now()->subDay()])->save();

    $user->notify(fakeNotification());
    $newer = $user->notifications()->where('id', '!=', $older->id)->sole();

    $result = listNotificationsQuery()->execute($user->id);

    expect($result->items()[0]->id)->toBe($newer->id);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/ListNotificationsQueryTest.php --compact`
Expected: FAIL — `Class "App\Modules\Notification\Application\Queries\ListNotificationsQuery" not found`

- [ ] **Step 3: Implement `ListNotificationsQuery`**

Create `app/Modules/Notification/Application/Queries/ListNotificationsQuery.php`:

```php
<?php

namespace App\Modules\Notification\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListNotificationsQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        int $userId,
        ?string $status = null,
        ?int $page = null,
        ?int $perPage = null,
    ): LengthAwarePaginator {
        $query = User::query()->findOrFail($userId)->notifications();

        if ($status === 'unread') {
            $query->whereNull('read_at');
        } elseif ($status === 'read') {
            $query->whereNotNull('read_at');
        }

        return $query
            ->latest('created_at')
            ->paginate(
                perPage: $perPage ?? self::DEFAULT_PER_PAGE,
                page: $page ?? 1,
            );
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/ListNotificationsQueryTest.php --compact`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/Modules/Notification/Application/Queries/ListNotificationsQuery.php tests/Feature/Modules/Notification/ListNotificationsQueryTest.php
git commit -m "feat(notification): add ListNotificationsQuery"
```

- [ ] **Step 6: Write the failing tests for `CountUnreadNotificationsQuery`**

Create `tests/Feature/Modules/Notification/CountUnreadNotificationsQueryTest.php`:

```php
<?php

use App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function countUnreadNotificationsQuery(): CountUnreadNotificationsQuery
{
    return app(CountUnreadNotificationsQuery::class);
}

function fakeNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('execute counts only unread notifications for the given user', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotification());
    $user->notify(fakeNotification());
    $user->notifications()->first()->markAsRead();

    expect(countUnreadNotificationsQuery()->execute($user->id))->toBe(1);
});

test('execute does not count notifications belonging to other users', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotification());

    expect(countUnreadNotificationsQuery()->execute($user->id))->toBe(0);
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/CountUnreadNotificationsQueryTest.php --compact`
Expected: FAIL — `Class "App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery" not found`

- [ ] **Step 8: Implement `CountUnreadNotificationsQuery`**

Create `app/Modules/Notification/Application/Queries/CountUnreadNotificationsQuery.php`:

```php
<?php

namespace App\Modules\Notification\Application\Queries;

use App\Modules\User\Infrastructure\Models\User;

final class CountUnreadNotificationsQuery
{
    public function execute(int $userId): int
    {
        return User::query()->findOrFail($userId)->unreadNotifications()->count();
    }
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/CountUnreadNotificationsQueryTest.php --compact`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add app/Modules/Notification/Application/Queries/CountUnreadNotificationsQuery.php tests/Feature/Modules/Notification/CountUnreadNotificationsQueryTest.php
git commit -m "feat(notification): add CountUnreadNotificationsQuery"
```

- [ ] **Step 11: Write the failing tests for `MarkNotificationAsReadUseCase`**

Create `tests/Feature/Modules/Notification/MarkNotificationAsReadUseCaseTest.php`:

```php
<?php

use App\Modules\Notification\Application\UseCases\MarkNotificationAsReadUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function markNotificationAsReadUseCase(): MarkNotificationAsReadUseCase
{
    return app(MarkNotificationAsReadUseCase::class);
}

function fakeNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('execute marks the notification as read', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotification());
    $notification = $user->notifications()->sole();

    markNotificationAsReadUseCase()->execute($user->id, $notification->id);

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('execute throws when the notification belongs to another user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotification());
    $notification = $otherUser->notifications()->sole();

    expect(fn () => markNotificationAsReadUseCase()->execute($user->id, $notification->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the notification id does not exist', function () {
    $user = User::factory()->create();

    expect(fn () => markNotificationAsReadUseCase()->execute($user->id, (string) Str::uuid()))
        ->toThrow(ModelNotFoundException::class);
});
```

- [ ] **Step 12: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/MarkNotificationAsReadUseCaseTest.php --compact`
Expected: FAIL — `Class "App\Modules\Notification\Application\UseCases\MarkNotificationAsReadUseCase" not found`

- [ ] **Step 13: Implement `MarkNotificationAsReadUseCase`**

Create `app/Modules/Notification/Application/UseCases/MarkNotificationAsReadUseCase.php`:

```php
<?php

namespace App\Modules\Notification\Application\UseCases;

use App\Modules\User\Infrastructure\Models\User;

final class MarkNotificationAsReadUseCase
{
    public function execute(int $userId, string $notificationId): void
    {
        $notification = User::query()->findOrFail($userId)
            ->notifications()
            ->findOrFail($notificationId);

        $notification->markAsRead();
    }
}
```

Returns `void` — the HTTP endpoint that calls this (Task 2) responds 204 No Content, so there is no caller that needs the notification object back.

- [ ] **Step 14: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/MarkNotificationAsReadUseCaseTest.php --compact`
Expected: PASS (3 tests)

- [ ] **Step 15: Commit**

```bash
git add app/Modules/Notification/Application/UseCases/MarkNotificationAsReadUseCase.php tests/Feature/Modules/Notification/MarkNotificationAsReadUseCaseTest.php
git commit -m "feat(notification): add MarkNotificationAsReadUseCase"
```

- [ ] **Step 16: Write the failing tests for `MarkAllNotificationsAsReadUseCase`**

Create `tests/Feature/Modules/Notification/MarkAllNotificationsAsReadUseCaseTest.php`:

```php
<?php

use App\Modules\Notification\Application\UseCases\MarkAllNotificationsAsReadUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function markAllNotificationsAsReadUseCase(): MarkAllNotificationsAsReadUseCase
{
    return app(MarkAllNotificationsAsReadUseCase::class);
}

function fakeNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('execute marks all unread notifications as read for the given user', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotification());
    $user->notify(fakeNotification());

    markAllNotificationsAsReadUseCase()->execute($user->id);

    expect($user->unreadNotifications()->count())->toBe(0);
});

test('execute does not mark notifications belonging to other users', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotification());

    markAllNotificationsAsReadUseCase()->execute($user->id);

    expect($otherUser->unreadNotifications()->count())->toBe(1);
});
```

- [ ] **Step 17: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/MarkAllNotificationsAsReadUseCaseTest.php --compact`
Expected: FAIL — `Class "App\Modules\Notification\Application\UseCases\MarkAllNotificationsAsReadUseCase" not found`

- [ ] **Step 18: Implement `MarkAllNotificationsAsReadUseCase`**

Create `app/Modules/Notification/Application/UseCases/MarkAllNotificationsAsReadUseCase.php`:

```php
<?php

namespace App\Modules\Notification\Application\UseCases;

use App\Modules\User\Infrastructure\Models\User;

final class MarkAllNotificationsAsReadUseCase
{
    public function execute(int $userId): void
    {
        User::query()->findOrFail($userId)
            ->unreadNotifications()
            ->update(['read_at' => now()]);
    }
}
```

- [ ] **Step 19: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/MarkAllNotificationsAsReadUseCaseTest.php --compact`
Expected: PASS (2 tests)

- [ ] **Step 20: Commit**

```bash
git add app/Modules/Notification/Application/UseCases/MarkAllNotificationsAsReadUseCase.php tests/Feature/Modules/Notification/MarkAllNotificationsAsReadUseCaseTest.php
git commit -m "feat(notification): add MarkAllNotificationsAsReadUseCase"
```

---

### Task 2: Presentation layer — routes, controller, request, resource

**Files:**
- Create: `app/Modules/Notification/Presentation/Http/Requests/ListNotificationsRequest.php`
- Create: `app/Modules/Notification/Presentation/Http/Resources/NotificationResource.php`
- Create: `app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php`
- Create: `routes/api/v1/notification.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Modules/Notification/ListNotificationsTest.php`
- Test: `tests/Feature/Modules/Notification/UnreadNotificationCountTest.php`
- Test: `tests/Feature/Modules/Notification/MarkNotificationAsReadTest.php`
- Test: `tests/Feature/Modules/Notification/MarkAllNotificationsAsReadTest.php`

**Interfaces:**
- Consumes (from Task 1): `ListNotificationsQuery::execute(int $userId, ?string $status, ?int $page, ?int $perPage): LengthAwarePaginator`, `CountUnreadNotificationsQuery::execute(int $userId): int`, `MarkNotificationAsReadUseCase::execute(int $userId, string $notificationId): void`, `MarkAllNotificationsAsReadUseCase::execute(int $userId): void`.
- Produces: HTTP routes `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all` — final, nothing downstream in this backend repo consumes these; a sibling frontend session (`frontend/lib/notification/api.ts`) already consumes exactly this contract.

**This task's response shapes are an external contract already relied upon by shipped frontend code — see Global Constraints above. Do not deviate from the exact JSON shapes, field casing, HTTP methods, or status codes shown in the code blocks below.**

- [ ] **Step 1: Write the failing test for listing notifications**

Create `tests/Feature/Modules/Notification/ListNotificationsTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function fakeApiNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('listing notifications requires authentication', function () {
    $response = $this->getJson('/api/v1/notifications');

    $response->assertStatus(401);
});

test('a user can list their own notifications', function () {
    $user = User::factory()->create();
    $user->notify(fakeApiNotification());

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'test_event')
        ->assertJsonPath('data.0.message', 'test notification')
        ->assertJsonPath('data.0.readAt', null)
        ->assertJsonStructure([
            'data' => [['id', 'type', 'message', 'readAt', 'createdAt']],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ]);
});

test('a user only sees their own notifications', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeApiNotification());

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications');

    $response->assertOk()->assertJsonCount(0, 'data');
});

test('listing notifications filters by unread status', function () {
    $user = User::factory()->create();
    $user->notify(fakeApiNotification());
    $user->notify(fakeApiNotification());
    $user->notifications()->first()->markAsRead();

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications?status=unread');

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('listing notifications returns camelCase pagination meta', function () {
    $user = User::factory()->create();
    collect(range(1, 3))->each(fn () => $user->notify(fakeApiNotification()));

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications?page=1&per_page=2');

    $response->assertOk()->assertJson([
        'meta' => ['currentPage' => 1, 'lastPage' => 2, 'perPage' => 2, 'total' => 3],
    ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/ListNotificationsTest.php --compact`
Expected: FAIL (5 tests) — the route doesn't exist yet, so every request 404s; even the "requires authentication" test fails because it asserts 401, not 404

- [ ] **Step 3: Implement `ListNotificationsRequest`, `NotificationResource`, the controller's `index()` action, and the route**

Create `app/Modules/Notification/Presentation/Http/Requests/ListNotificationsRequest.php`:

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListNotificationsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['unread', 'read'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

Create `app/Modules/Notification/Presentation/Http/Resources/NotificationResource.php`:

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->data['type'],
            'message' => $this->data['message'],
            'readAt' => $this->read_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

Note the flat `type`/`message` fields (read out of the `data` json blob) and **camelCase** `readAt`/`createdAt` — this is the exact `NotificationItem` shape frontend's `frontend/lib/notification/types.ts` already expects.

Create `app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php`:

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notification\Application\Queries\ListNotificationsQuery;
use App\Modules\Notification\Presentation\Http\Requests\ListNotificationsRequest;
use App\Modules\Notification\Presentation\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function __construct(
        private readonly ListNotificationsQuery $listNotifications,
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
}
```

The response is built explicitly (not `NotificationResource::collection($paginator)->response()`) because Laravel's automatic paginated-resource response produces snake_case `current_page`/`last_page`/`per_page` plus a `links` key — the frontend contract requires camelCase `currentPage`/`lastPage`/`perPage`/`total` and nothing else in `meta`.

Create `routes/api/v1/notification.php`:

```php
<?php

use App\Modules\Notification\Presentation\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
});
```

Modify `routes/api.php` — add the require line inside the existing `auth` middleware group:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/dashboard/vendors.php';
        require __DIR__.'/api/v1/notification.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/ListNotificationsTest.php --compact`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/Modules/Notification/Presentation/Http/Requests/ListNotificationsRequest.php app/Modules/Notification/Presentation/Http/Resources/NotificationResource.php app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php routes/api/v1/notification.php routes/api.php tests/Feature/Modules/Notification/ListNotificationsTest.php
git commit -m "feat(notification): add GET /notifications list endpoint"
```

- [ ] **Step 6: Write the failing test for unread count**

Create `tests/Feature/Modules/Notification/UnreadNotificationCountTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function fakeApiNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('unread count requires authentication', function () {
    $response = $this->getJson('/api/v1/notifications/unread-count');

    $response->assertStatus(401);
});

test('unread count only reflects the current user notifications', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $user->notify(fakeApiNotification());
    $otherUser->notify(fakeApiNotification());
    $otherUser->notify(fakeApiNotification());

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications/unread-count');

    $response->assertOk()->assertJson(['data' => ['count' => 1]]);
});
```

Note the `{ "data": { "count": n } }` shape — wrapped one level deeper than the list endpoint.

- [ ] **Step 7: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/UnreadNotificationCountTest.php --compact`
Expected: FAIL (2 tests) — `unread-count` route doesn't exist yet, so every request 404s, including the "requires authentication" test which asserts 401

- [ ] **Step 8: Implement the `unreadCount()` action and route**

Modify `app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php` — add the `CountUnreadNotificationsQuery` dependency and the `unreadCount()` action:

```php
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
```

Modify `routes/api/v1/notification.php`:

```php
<?php

use App\Modules\Notification\Presentation\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
});
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/UnreadNotificationCountTest.php --compact`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php routes/api/v1/notification.php tests/Feature/Modules/Notification/UnreadNotificationCountTest.php
git commit -m "feat(notification): add GET /notifications/unread-count endpoint"
```

- [ ] **Step 11: Write the failing test for marking a single notification as read**

Create `tests/Feature/Modules/Notification/MarkNotificationAsReadTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function fakeApiNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('marking a notification as read requires authentication', function () {
    $response = $this->patchJson('/api/v1/notifications/'.Str::uuid().'/read');

    $response->assertStatus(401);
});

test('a user can mark their own notification as read', function () {
    $user = User::factory()->create();
    $user->notify(fakeApiNotification());
    $notification = $user->notifications()->sole();

    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/notifications/{$notification->id}/read");

    $response->assertNoContent();
    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('a user cannot mark another user notification as read', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeApiNotification());
    $notification = $otherUser->notifications()->sole();

    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/notifications/{$notification->id}/read");

    $response->assertStatus(404);
    expect($notification->fresh()->read_at)->toBeNull();
});

test('marking a nonexistent notification as read returns 404', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'web');

    $response = $this->patchJson('/api/v1/notifications/'.Str::uuid().'/read');

    $response->assertStatus(404);
});
```

Note `patchJson`, not `postJson` — the route is `PATCH`. `assertNoContent()` asserts HTTP 204 with an empty body.

- [ ] **Step 12: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/MarkNotificationAsReadTest.php --compact`
Expected: FAIL (4 tests) — `{id}/read` route doesn't exist yet, so every request 404s, including the "requires authentication" test which asserts 401

- [ ] **Step 13: Implement the `markAsRead()` action and route**

Modify `app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php` — add the `MarkNotificationAsReadUseCase` dependency and the `markAsRead()` action:

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery;
use App\Modules\Notification\Application\Queries\ListNotificationsQuery;
use App\Modules\Notification\Application\UseCases\MarkNotificationAsReadUseCase;
use App\Modules\Notification\Presentation\Http\Requests\ListNotificationsRequest;
use App\Modules\Notification\Presentation\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    public function __construct(
        private readonly ListNotificationsQuery $listNotifications,
        private readonly CountUnreadNotificationsQuery $countUnreadNotifications,
        private readonly MarkNotificationAsReadUseCase $markNotificationAsRead,
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

    public function markAsRead(Request $request, string $id): Response
    {
        $this->markNotificationAsRead->execute($request->user()->id, $id);

        return response()->noContent();
    }
}
```

Modify `routes/api/v1/notification.php`:

```php
<?php

use App\Modules\Notification\Presentation\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('{id}/read', [NotificationController::class, 'markAsRead'])->whereUuid('id')->name('notifications.read');
});
```

Note `Route::patch`, not `Route::post`.

- [ ] **Step 14: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/MarkNotificationAsReadTest.php --compact`
Expected: PASS (4 tests)

- [ ] **Step 15: Commit**

```bash
git add app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php routes/api/v1/notification.php tests/Feature/Modules/Notification/MarkNotificationAsReadTest.php
git commit -m "feat(notification): add PATCH /notifications/{id}/read endpoint"
```

- [ ] **Step 16: Write the failing test for marking all notifications as read**

Create `tests/Feature/Modules/Notification/MarkAllNotificationsAsReadTest.php`:

```php
<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function fakeApiNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('marking all notifications as read requires authentication', function () {
    $response = $this->patchJson('/api/v1/notifications/read-all');

    $response->assertStatus(401);
});

test('a user can mark all their notifications as read', function () {
    $user = User::factory()->create();
    $user->notify(fakeApiNotification());
    $user->notify(fakeApiNotification());

    $this->actingAs($user, 'web');

    $response = $this->patchJson('/api/v1/notifications/read-all');

    $response->assertNoContent();
    expect($user->unreadNotifications()->count())->toBe(0);
});

test('marking all as read does not affect another user notifications', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeApiNotification());

    $this->actingAs($user, 'web');

    $this->patchJson('/api/v1/notifications/read-all');

    expect($otherUser->unreadNotifications()->count())->toBe(1);
});
```

- [ ] **Step 17: Run the test to verify it fails**

Run: `php artisan test tests/Feature/Modules/Notification/MarkAllNotificationsAsReadTest.php --compact`
Expected: FAIL (3 tests) — `read-all` route doesn't exist yet, so every request 404s, including the "requires authentication" test which asserts 401

- [ ] **Step 18: Implement the `markAllAsRead()` action and route**

Modify `app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php` — add the `MarkAllNotificationsAsReadUseCase` dependency and the `markAllAsRead()` action:

```php
<?php

namespace App\Modules\Notification\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery;
use App\Modules\Notification\Application\Queries\ListNotificationsQuery;
use App\Modules\Notification\Application\UseCases\MarkAllNotificationsAsReadUseCase;
use App\Modules\Notification\Application\UseCases\MarkNotificationAsReadUseCase;
use App\Modules\Notification\Presentation\Http\Requests\ListNotificationsRequest;
use App\Modules\Notification\Presentation\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    public function __construct(
        private readonly ListNotificationsQuery $listNotifications,
        private readonly CountUnreadNotificationsQuery $countUnreadNotifications,
        private readonly MarkNotificationAsReadUseCase $markNotificationAsRead,
        private readonly MarkAllNotificationsAsReadUseCase $markAllNotificationsAsRead,
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

    public function markAsRead(Request $request, string $id): Response
    {
        $this->markNotificationAsRead->execute($request->user()->id, $id);

        return response()->noContent();
    }

    public function markAllAsRead(Request $request): Response
    {
        $this->markAllNotificationsAsRead->execute($request->user()->id);

        return response()->noContent();
    }
}
```

Modify `routes/api/v1/notification.php`:

```php
<?php

use App\Modules\Notification\Presentation\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('{id}/read', [NotificationController::class, 'markAsRead'])->whereUuid('id')->name('notifications.read');
    Route::patch('read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
});
```

- [ ] **Step 19: Run the test to verify it passes**

Run: `php artisan test tests/Feature/Modules/Notification/MarkAllNotificationsAsReadTest.php --compact`
Expected: PASS (3 tests)

- [ ] **Step 20: Run the full test suite to confirm no regressions**

Run: `php artisan test --compact`
Expected: Same baseline as before this plan (341 tests, 336 passed, 5 pre-existing unrelated failures) plus all new tests from Task 1 and Task 2 passing — total new tests: 12 (Task 1) + 14 (Task 2) = 26 new passing tests.

- [ ] **Step 21: Commit**

```bash
git add app/Modules/Notification/Presentation/Http/Controllers/NotificationController.php routes/api/v1/notification.php tests/Feature/Modules/Notification/MarkAllNotificationsAsReadTest.php
git commit -m "feat(notification): add PATCH /notifications/read-all endpoint"
```
