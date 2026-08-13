<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function fakeNotificationForMarkAllNotificationsAsReadEndpoint(): Notification
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
    $user->notify(fakeNotificationForMarkAllNotificationsAsReadEndpoint());
    $user->notify(fakeNotificationForMarkAllNotificationsAsReadEndpoint());

    $this->actingAs($user, 'web');

    $response = $this->patchJson('/api/v1/notifications/read-all');

    $response->assertNoContent();
    expect($user->unreadNotifications()->count())->toBe(0);
});

test('marking all as read does not affect another user notifications', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotificationForMarkAllNotificationsAsReadEndpoint());

    $this->actingAs($user, 'web');

    $this->patchJson('/api/v1/notifications/read-all');

    expect($otherUser->unreadNotifications()->count())->toBe(1);
});
