<?php

use App\Modules\Notification\Application\Queries\CountUnreadNotificationsQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function countUnreadNotificationsQueryHelper(): CountUnreadNotificationsQuery
{
    return app(CountUnreadNotificationsQuery::class);
}

function fakeNotificationForCountUnreadNotificationsQuery(): Notification
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
    $user->notify(fakeNotificationForCountUnreadNotificationsQuery());
    $user->notify(fakeNotificationForCountUnreadNotificationsQuery());
    $user->notifications()->first()->markAsRead();

    expect(countUnreadNotificationsQueryHelper()->execute($user->id))->toBe(1);
});

test('execute does not count notifications belonging to other users', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotificationForCountUnreadNotificationsQuery());

    expect(countUnreadNotificationsQueryHelper()->execute($user->id))->toBe(0);
});
