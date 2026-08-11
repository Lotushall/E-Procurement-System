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
