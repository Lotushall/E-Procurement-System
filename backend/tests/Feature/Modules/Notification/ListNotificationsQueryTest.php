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
